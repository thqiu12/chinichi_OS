import { prisma, safe } from "@/lib/db";
import { CHANNEL_TREE, MAJOR_TREE, SCHOOL_TIERS } from "../prisma/seed-dict";

export type ChannelNode = {
  id: string;
  name: string;
  level: "L1" | "L2" | "L3";
  isCustom?: boolean;
  children: ChannelNode[];
};

export async function getChannelTree(): Promise<ChannelNode[]> {
  const rows = await safe(
    () => prisma.channel.findMany({ orderBy: [{ level: "asc" }, { order: "asc" }, { name: "asc" }] }),
    [] as any[],
  );

  if (rows.length === 0) {
    // Fallback: build from the static seed-dict source so the UI still works without a DB.
    let n = 0;
    const mkId = () => `seed-${n++}`;
    return CHANNEL_TREE.map((l1) => ({
      id: mkId(), name: l1.name, level: "L1" as const, isCustom: false,
      children: l1.l2.map((l2) => ({
        id: mkId(), name: l2.name, level: "L2" as const, isCustom: false,
        children: (l2.l3 ?? []).map((l3) => ({
          id: mkId(), name: l3, level: "L3" as const, isCustom: false, children: [],
        })),
      })),
    }));
  }

  const byId = new Map<string, ChannelNode>();
  for (const r of rows) {
    byId.set(r.id, { id: r.id, name: r.name, level: r.level, isCustom: r.isCustom, children: [] });
  }
  const roots: ChannelNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parentId && byId.has(r.parentId)) byId.get(r.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export type MajorNode = { id: string; name: string; level: number; children: MajorNode[] };

export async function getMajorTree(): Promise<MajorNode[]> {
  const rows = await safe(
    () => prisma.major.findMany({ orderBy: [{ level: "asc" }, { order: "asc" }, { name: "asc" }] }),
    [] as any[],
  );

  if (rows.length === 0) {
    let n = 0;
    const mkId = () => `seed-${n++}`;
    return MAJOR_TREE.map((g) => ({
      id: mkId(), name: g.l1, level: 1,
      children: g.l2.map((m) => ({ id: mkId(), name: m, level: 2, children: [] })),
    }));
  }

  const byId = new Map<string, MajorNode>();
  for (const r of rows) byId.set(r.id, { id: r.id, name: r.name, level: r.level, children: [] });
  const roots: MajorNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parentId && byId.has(r.parentId)) byId.get(r.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export type SchoolTierGroup = {
  category: string;
  label: string;
  groups: { subgroup: string | null; tiers: { id: string; name: string }[] }[];
};

const CATEGORY_LABEL: Record<string, string> = {
  ARTS_SCIENCES: "文理类",
  ART: "艺术类",
  SPORTS: "体育类",
};

export async function getSchoolTiers(): Promise<SchoolTierGroup[]> {
  const rows = await safe(
    () => prisma.schoolTier.findMany({ orderBy: { order: "asc" } }),
    [] as any[],
  );

  let data = rows;
  if (data.length === 0) {
    data = SCHOOL_TIERS.map((t, i) => ({ id: `seed-${i}`, ...t, order: i }));
  }

  const byCategory = new Map<string, Map<string | null, { id: string; name: string }[]>>();
  for (const r of data) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, new Map());
    const sub = byCategory.get(r.category)!;
    if (!sub.has(r.subgroup ?? null)) sub.set(r.subgroup ?? null, []);
    sub.get(r.subgroup ?? null)!.push({ id: r.id, name: r.name });
  }

  return [...byCategory.entries()].map(([category, subMap]) => ({
    category,
    label: CATEGORY_LABEL[category] ?? category,
    groups: [...subMap.entries()].map(([subgroup, tiers]) => ({ subgroup, tiers })),
  }));
}
