import { prisma, safe } from "@/lib/db";
import { normalizePhone, normalizeWechat } from "@/lib/normalize";
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
    byLevelName: { L1: new Map(), L2: new Map(), L3: new Map() },
  };
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

/**
 * Build in-memory phone/wechat indexes of all existing leads in ONE query.
 * Per-row dedupe then becomes O(1) in-memory instead of an extra DB roundtrip
 * (which is what was timing out a Hobby 10s function with Neon in us-east-1).
 */
async function buildDedupeIndex() {
  const all = await safe(
    () =>
      prisma.lead.findMany({
        select: { id: true, name: true, phone: true, wechatId: true },
      }),
    [] as { id: string; name: string; phone: string | null; wechatId: string | null }[],
  );
  const byWechat = new Map<string, { id: string; name: string }>();
  const byPhone  = new Map<string, { id: string; name: string }>();
  for (const l of all) {
    const w = normalizeWechat(l.wechatId);
    if (w) byWechat.set(w, { id: l.id, name: l.name });
    const p = normalizePhone(l.phone);
    if (p) byPhone.set(p, { id: l.id, name: l.name });
  }
  return { byWechat, byPhone };
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

  // Load once per chunk: dicts + dedupe index. Both are single queries.
  const [dicts, dedupeIdx] = await Promise.all([buildDicts(), buildDedupeIndex()]);

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = startIndex + i + 2; // +2: spreadsheet row 1 is headers
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

    // In-memory dedupe (no DB roundtrip).
    const wn = normalizeWechat(payload.lead.wechatId);
    const pn = normalizePhone(payload.lead.phone);
    const wechatHit = wn ? dedupeIdx.byWechat.get(wn) : undefined;
    const phoneHit  = pn ? dedupeIdx.byPhone.get(pn) : undefined;
    if (wechatHit || phoneHit) {
      const hit = wechatHit ?? phoneHit!;
      const why = wechatHit && phoneHit ? "WECHAT+PHONE" : wechatHit ? "WECHAT" : "PHONE";
      result.skipped++;
      result.rows.push({
        row: rowNum, ok: false,
        reason: `duplicate of ${hit.name} (${why}) → ${hit.id}`,
      });
      continue;
    }

    if (opts.dryRun) {
      // Reserve the keys so a duplicate later in the same file doesn't pass
      if (wn) dedupeIdx.byWechat.set(wn, { id: "(dry-run)", name: payload.lead.name });
      if (pn) dedupeIdx.byPhone.set(pn, { id: "(dry-run)", name: payload.lead.name });
      result.created++;
      result.rows.push({ row: rowNum, ok: true, leadId: "(dry-run)" });
      continue;
    }

    // Insert.
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
        // NOTE: we deliberately skip the lastAdvisorFollowUpAt / lastFrontendFollowUpAt
        // cache update here. Each row would cost another ~150ms DB roundtrip and
        // push 10-row chunks past Hobby's 10s ceiling. Run a one-off backfill
        // after import: UPDATE Lead SET lastAdvisorFollowUpAt = (subquery), etc.
        return created;
      });

      // Reserve keys so subsequent rows in the same chunk skip on duplicate
      if (wn) dedupeIdx.byWechat.set(wn, { id: lead.id, name: lead.name });
      if (pn) dedupeIdx.byPhone.set(pn, { id: lead.id, name: lead.name });

      result.created++;
      result.rows.push({ row: rowNum, ok: true, leadId: lead.id });
    } catch (e) {
      result.failed++;
      result.rows.push({ row: rowNum, ok: false, reason: `insert error: ${(e as Error).message}` });
    }
  }

  return result;
}
