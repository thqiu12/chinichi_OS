import { prisma, safe } from "@/lib/db";
import { normalizePhone, normalizeWechat, normalizeName } from "@/lib/normalize";
import type { Lead } from "@prisma/client";

export type DupReason =
  | "PHONE"      // normalized phone match → strong
  | "WECHAT"     // normalized wechat match → strong
  | "NAME";     // exact normalized name → weak

export type DupMatch = {
  id: string;
  name: string;
  phone: string | null;
  wechatId: string | null;
  status: string;
  salesId: string | null;
  conversionProbability: number;
  createdAt: Date;
  matchedOn: DupReason[];
};

/**
 * Check a single proposed input against existing leads.
 * Excludes the lead with `excludeId` (useful when editing).
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

  // Fetch a small candidate set; dedupe in JS so we can normalize.
  // For larger datasets, add normalized columns + DB-side query.
  const candidates = await safe(
    () =>
      prisma.lead.findMany({
        where: {
          NOT: input.excludeId ? { id: input.excludeId } : undefined,
          OR: [
            phoneN  ? { phone:    { not: null } } : undefined,
            wechatN ? { wechatId: { not: null } } : undefined,
            nameN   ? { name:     { contains: nameN.slice(0, 2) } } : undefined,
          ].filter(Boolean) as any,
        },
        take: 200,
      }),
    [] as Lead[],
  );

  const out = new Map<string, DupMatch>();
  for (const c of candidates) {
    const reasons: DupReason[] = [];
    if (phoneN  && normalizePhone(c.phone)    === phoneN)  reasons.push("PHONE");
    if (wechatN && normalizeWechat(c.wechatId) === wechatN) reasons.push("WECHAT");
    if (nameN   && normalizeName(c.name)      === nameN)   reasons.push("NAME");
    if (!reasons.length) continue;
    out.set(c.id, {
      id: c.id, name: c.name, phone: c.phone, wechatId: c.wechatId,
      status: c.status, salesId: c.salesId,
      conversionProbability: c.conversionProbability,
      createdAt: c.createdAt, matchedOn: reasons,
    });
  }

  // Strong matches first (phone/wechat), then weak (name-only).
  return [...out.values()].sort((a, b) => {
    const strongA = a.matchedOn.some((r) => r === "PHONE" || r === "WECHAT");
    const strongB = b.matchedOn.some((r) => r === "PHONE" || r === "WECHAT");
    if (strongA !== strongB) return strongA ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export type Cluster = {
  key: string;        // the normalized value that grouped them
  reason: DupReason;
  leads: DupMatch[];
};

/**
 * Scan whole DB for duplicate clusters. Cheap for MVP (<10k leads);
 * if it grows, push to a materialized table.
 */
export async function findClusters(): Promise<Cluster[]> {
  const all = await safe(
    () => prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    [] as Lead[],
  );

  const byPhone  = new Map<string, Lead[]>();
  const byWechat = new Map<string, Lead[]>();
  const byName   = new Map<string, Lead[]>();

  for (const l of all) {
    const p = normalizePhone(l.phone);
    if (p) (byPhone.get(p)  ?? byPhone.set(p,  []).get(p)!).push(l);
    const w = normalizeWechat(l.wechatId);
    if (w) (byWechat.get(w) ?? byWechat.set(w, []).get(w)!).push(l);
    const n = normalizeName(l.name);
    if (n) (byName.get(n)   ?? byName.set(n,   []).get(n)!).push(l);
  }

  const clusters: Cluster[] = [];
  const seenPair = new Set<string>(); // skip name-only cluster if pair already seen via stronger reason

  function pushCluster(reason: DupReason, key: string, leads: Lead[]) {
    if (leads.length < 2) return;
    const ids = leads.map((l) => l.id).sort();
    const pair = ids.join("|");
    if (reason === "NAME" && seenPair.has(pair)) return;
    if (reason !== "NAME") seenPair.add(pair);
    clusters.push({
      key, reason,
      leads: leads.map((l) => ({
        id: l.id, name: l.name, phone: l.phone, wechatId: l.wechatId,
        status: l.status, salesId: l.salesId,
        conversionProbability: l.conversionProbability,
        createdAt: l.createdAt, matchedOn: [reason],
      })),
    });
  }

  for (const [k, v] of byPhone)  pushCluster("PHONE",  k, v);
  for (const [k, v] of byWechat) pushCluster("WECHAT", k, v);
  for (const [k, v] of byName)   pushCluster("NAME",   k, v);

  return clusters;
}
