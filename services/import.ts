import { prisma, safe } from "@/lib/db";
import { findDuplicates } from "./dedupe";
import {
  detectFormat, mapLegacyRow, mapTemplateRow,
  type ChannelDict, type MajorDict, type SchoolTierDict,
} from "@/lib/import-mapper";
import { CONTRACT_STAGES, TERMINAL_STAGES } from "@/lib/dict";

export type ImportRowResult =
  | { row: number; ok: true; leadId: string }
  | { row: number; ok: false; reason: string };

export type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
};

async function buildDicts(): Promise<{ channels: ChannelDict; majors: MajorDict; tiers: SchoolTierDict }> {
  const [channels, majors, tiers] = await Promise.all([
    safe(() => prisma.channel.findMany(), [] as any[]),
    safe(() => prisma.major.findMany(),   [] as any[]),
    safe(() => prisma.schoolTier.findMany(), [] as any[]),
  ]);

  const cd: ChannelDict = {
    byLevelName: {
      L1: new Map(),
      L2: new Map(),
      L3: new Map(),
    },
  };
  // index by name within level + parent scope
  for (const c of channels) {
    if (c.level === "L1") cd.byLevelName.L1.set(c.name.normalize("NFKC").trim(), c.id);
    else if (c.level === "L2") {
      if (!cd.byLevelName.L2.has(c.parentId)) cd.byLevelName.L2.set(c.parentId, new Map());
      cd.byLevelName.L2.get(c.parentId)!.set(c.name.normalize("NFKC").trim(), c.id);
    } else if (c.level === "L3") {
      if (!cd.byLevelName.L3.has(c.parentId)) cd.byLevelName.L3.set(c.parentId, new Map());
      cd.byLevelName.L3.get(c.parentId)!.set(c.name.normalize("NFKC").trim(), c.id);
    }
  }

  const md: MajorDict = { byName: new Map(), byPair: new Map() };
  // Build "L1 name → id" and "L2 name → id" + pair lookup
  const l1NameById = new Map<string, string>();
  for (const m of majors.filter((x) => x.level === 1)) l1NameById.set(m.id, m.name);
  for (const m of majors.filter((x) => x.level === 2)) {
    md.byName.set(m.name.normalize("NFKC").trim(), m.id);
    if (m.parentId) {
      const l1n = l1NameById.get(m.parentId);
      if (l1n) md.byPair.set(`${l1n}|${m.name.normalize("NFKC").trim()}`, m.id);
    }
  }

  const td: SchoolTierDict = new Map();
  for (const t of tiers) td.set(t.name.normalize("NFKC").trim(), t.id);

  return { channels: cd, majors: md, tiers: td };
}

export async function importLeads(
  rawRows: any[],
  opts: { authorId: string | null; dryRun?: boolean; startIndex?: number } = { authorId: null },
): Promise<ImportResult> {
  const startIndex = opts.startIndex ?? 0;
  const result: ImportResult = { total: rawRows.length, created: 0, skipped: 0, failed: 0, rows: [] };
  if (rawRows.length === 0) return result;

  const headers = Object.keys(rawRows[0]);
  const format = detectFormat(headers);
  const dicts = await buildDicts();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = startIndex + i + 2; // +2 since spreadsheet row 1 is headers
    let payload;
    try {
      payload = format === "template"
        ? mapTemplateRow(rawRows[i], rowNum, dicts)
        : mapLegacyRow(rawRows[i], rowNum, dicts);
    } catch (e) {
      result.failed++;
      result.rows.push({ row: rowNum, ok: false, reason: `mapping error: ${(e as Error).message}` });
      continue;
    }

    if (!payload.lead.name) {
      result.failed++;
      result.rows.push({ row: rowNum, ok: false, reason: "missing 姓名" });
      continue;
    }
    if (!payload.lead.wechatId && !payload.lead.phone) {
      result.failed++;
      result.rows.push({ row: rowNum, ok: false, reason: "missing 微信号 and 手机号" });
      continue;
    }

    // Dedupe (per PRD: WeChat first, then phone)
    try {
      const matches = await findDuplicates({
        wechatId: payload.lead.wechatId,
        phone: payload.lead.phone,
        name: payload.lead.name,
      });
      const strong = matches.find((m) => m.matchedOn.includes("WECHAT") || m.matchedOn.includes("PHONE"));
      if (strong) {
        result.skipped++;
        result.rows.push({
          row: rowNum, ok: false,
          reason: `duplicate of ${strong.name} (${strong.matchedOn.join("+")}) → ${strong.id}`,
        });
        continue;
      }
    } catch (e) {
      // Dedupe is best-effort; if DB is down, fall back to "fail row"
      result.failed++;
      result.rows.push({ row: rowNum, ok: false, reason: `dedupe error: ${(e as Error).message}` });
      continue;
    }

    if (opts.dryRun) {
      result.created++;
      result.rows.push({ row: rowNum, ok: true, leadId: "(dry-run)" });
      continue;
    }

    // Insert
    try {
      const lead = await prisma.$transaction(async (tx) => {
        const { force: _drop, ...leadData } = payload.lead;
        const created = await tx.lead.create({
          data: {
            ...leadData,
            salesId: opts.authorId,
            ownerIds: opts.authorId ? [opts.authorId] : [],
            createdById: opts.authorId,
          },
        });

        if (payload.advisorFollowUp) {
          const af = payload.advisorFollowUp;
          const isExpired = af.advisorConfirmation === "EXPIRED";
          const isTerminal = af.conversionStage && TERMINAL_STAGES.has(af.conversionStage);
          const allowReminder = !isExpired && !isTerminal;
          await tx.advisorFollowUp.create({
            data: {
              leadId: created.id,
              authorId: opts.authorId,
              advisorConfirmation: af.advisorConfirmation,
              isEffective: af.isEffective ?? true,
              detail: af.detail || "(导入)",
              conversionStage: af.conversionStage,
              visitedOffice: allowReminder ? !!af.visitedOffice : false,
              attendedTrial: allowReminder ? !!af.attendedTrial : false,
              expiredReason: isExpired ? af.expiredReason : null,
              lostReason: af.conversionStage === "输单" ? af.lostReason : null,
              reminderDays: allowReminder ? af.reminderDays : null,
            },
          });
          await tx.lead.update({
            where: { id: created.id },
            data: { lastAdvisorFollowUpAt: new Date() },
          });
        }
        if (payload.frontendFollowUp) {
          const ff = payload.frontendFollowUp;
          await tx.frontendFollowUp.create({
            data: {
              leadId: created.id,
              authorId: opts.authorId,
              communicationRef: ff.communicationRef,
              assignedCampus: ff.assignedCampus,
              assignedAt: ff.assignedAt,
              revisitDetail: ff.revisitDetail,
              revisitNote: ff.revisitNote,
              revisitAt: ff.revisitAt,
              addedOwnerIds: [],
              removedOwnerIds: [],
            },
          });
          await tx.lead.update({
            where: { id: created.id },
            data: { lastFrontendFollowUpAt: new Date() },
          });
        }
        if (payload.contract && payload.advisorFollowUp?.conversionStage &&
            CONTRACT_STAGES.has(payload.advisorFollowUp.conversionStage)) {
          await tx.contract.create({
            data: {
              leadId: created.id,
              amount: payload.contract.amount,
              signedAt: payload.contract.signedAt,
              isRenewal: payload.contract.isRenewal,
              toLanguageSchool: payload.contract.toLanguageSchool,
              languageSchool: payload.contract.languageSchool,
              meta: payload.contract.meta,
            },
          });
        }
        return created;
      });

      result.created++;
      result.rows.push({ row: rowNum, ok: true, leadId: lead.id });
    } catch (e) {
      result.failed++;
      result.rows.push({ row: rowNum, ok: false, reason: `insert error: ${(e as Error).message}` });
    }
  }

  return result;
}
