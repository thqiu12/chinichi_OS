import { prisma, safe } from "@/lib/db";
import { normalizePhone, normalizeWechat, normalizeName } from "@/lib/normalize";
import type { Lead } from "@prisma/client";

// Priority: WeChat ID is the strongest signal (one person, one wechat —
// rarely shared). Phone can be shared by parents/family. Name alone is weak.
export type DupReason = "WECHAT" | "PHONE" | "NAME";

const REASON_RANK: Record<DupReason, number> = {
  WECHAT: 0, // strongest
  PHONE:  1,
  NAME:   2, // weakest
};

export type DupMatch = {
  id: string;
  name: string;
  phone: string | null;
  wechatId: string | null;
  // CRM 2.0: expose both 资源属性 and 有效资源转化阶段 (per PRD 1107 + 0827)
  resourceAttribute: string;
  conversionStage: string | null;
  advisorConfirmation: string | null;
  salesId: string | null;
  conversionProbability: number;
  createdAt: Date;
  matchedOn: DupReason[];     // sorted strongest first
  strength: "STRONG" | "WEAK"; // STRONG = wechat or phone hit; WEAK = name-only
};

function pickIdentity(c: Lead) {
  return {
    id: c.id, name: c.name, phone: c.phone, wechatId: c.wechatId,
    resourceAttribute: c.resourceAttribute,
    conversionStage: c.conversionStage,
    advisorConfirmation: c.advisorConfirmation,
    salesId: c.salesId,
    conversionProbability: c.conversionProbability,
    createdAt: c.createdAt,
  };
}

/**
 * Check a proposed input against existing leads.
 * `excludeId` lets editing flows ignore the current record.
 */
export async function findDuplicates(input: {
  phone?: string | null;
  wechatId?: string | null;
  name?: string | null;
  excludeId?: string;
}): Promise<DupMatch[]> {
  const phoneN  = normalizePhone(input.phone);
  const wechatN = normalizeWechat(input.wechatId);
  const nameN   = normalizeName(input.name);

  if (!phoneN && !wechatN && !nameN) return [];

  const candidates = await safe(
    () =>
      prisma.lead.findMany({
        where: {
          NOT: input.excludeId ? { id: input.excludeId } : undefined,
          OR: [
            wechatN ? { wechatId: { not: null } } : undefined,
            phoneN  ? { phone:    { not: null } } : undefined,
            nameN   ? { name:     { contains: nameN.slice(0, 2) } } : undefined,
          ].filter(Boolean) as any,
        },
        take: 200,
      }),
    [] as Lead[],
  );

  const out: DupMatch[] = [];
  for (const c of candidates) {
    const reasons: DupReason[] = [];
    if (wechatN && normalizeWechat(c.wechatId) === wechatN) reasons.push("WECHAT");
    if (phoneN  && normalizePhone(c.phone)     === phoneN)  reasons.push("PHONE");
    if (nameN   && normalizeName(c.name)       === nameN)   reasons.push("NAME");
    if (!reasons.length) continue;

    reasons.sort((a, b) => REASON_RANK[a] - REASON_RANK[b]);
    const strength: "STRONG" | "WEAK" =
      reasons.some((r) => r === "WECHAT" || r === "PHONE") ? "STRONG" : "WEAK";

    out.push({ ...pickIdentity(c), matchedOn: reasons, strength });
  }

  return out.sort((a, b) => {
    const ra = REASON_RANK[a.matchedOn[0]];
    const rb = REASON_RANK[b.matchedOn[0]];
    if (ra !== rb) return ra - rb;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export type Cluster = {
  key: string;
  reason: DupReason;
  leads: DupMatch[];
};

export async function findClusters(): Promise<Cluster[]> {
  const all = await safe(
    () => prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    [] as Lead[],
  );

  const byWechat = new Map<string, Lead[]>();
  const byPhone  = new Map<string, Lead[]>();
  const byName   = new Map<string, Lead[]>();

  for (const l of all) {
    const w = normalizeWechat(l.wechatId);
    if (w) (byWechat.get(w) ?? byWechat.set(w, []).get(w)!).push(l);
    const p = normalizePhone(l.phone);
    if (p) (byPhone.get(p)  ?? byPhone.set(p,  []).get(p)!).push(l);
    const n = normalizeName(l.name);
    if (n) (byName.get(n)   ?? byName.set(n,   []).get(n)!).push(l);
  }

  const clusters: Cluster[] = [];
  const seenInWechat = new Set<string>();
  const seenInStrong = new Set<string>();

  function pairKeys(leads: Lead[]): string[] {
    const ids = leads.map((l) => l.id).sort();
    const out: string[] = [];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        out.push(`${ids[i]}|${ids[j]}`);
    return out;
  }

  function makeMatch(l: Lead, reason: DupReason): DupMatch {
    return {
      ...pickIdentity(l),
      matchedOn: [reason],
      strength: reason === "NAME" ? "WEAK" : "STRONG",
    };
  }

  for (const [k, v] of byWechat) {
    if (v.length < 2) continue;
    for (const p of pairKeys(v)) { seenInWechat.add(p); seenInStrong.add(p); }
    clusters.push({ reason: "WECHAT", key: k, leads: v.map((l) => makeMatch(l, "WECHAT")) });
  }
  for (const [k, v] of byPhone) {
    if (v.length < 2) continue;
    const allPairs = pairKeys(v);
    if (allPairs.every((p) => seenInWechat.has(p))) continue;
    for (const p of allPairs) seenInStrong.add(p);
    clusters.push({ reason: "PHONE", key: k, leads: v.map((l) => makeMatch(l, "PHONE")) });
  }
  for (const [k, v] of byName) {
    if (v.length < 2) continue;
    const allPairs = pairKeys(v);
    if (allPairs.every((p) => seenInStrong.has(p))) continue;
    clusters.push({ reason: "NAME", key: k, leads: v.map((l) => makeMatch(l, "NAME")) });
  }

  return clusters.sort((a, b) => REASON_RANK[a.reason] - REASON_RANK[b.reason]);
}
