import { prisma, safe } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { addDays, startOfDay } from "@/lib/utils";
import { RESOURCE_ATTRIBUTE_ORDER } from "@/lib/dict";

export async function getCrmHome() {
  const me = await currentUser();
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);
  const monthStart = addDays(today, -29);

  const scope = me.role === "ADMIN" || me.id === "demo" ? {} : { salesId: me.id };

  const [
    todayFocus,
    trials,
    recentWon,
    allLeads,
    funnel,
    sources,
  ] = await Promise.all([
    safe(
      () =>
        prisma.lead.findMany({
          where: {
            ...scope,
            nextActionDueAt: { lte: tomorrow },
            resourceAttribute: { in: ["PENDING", "VALID"] },
          },
          orderBy: { nextActionDueAt: "asc" },
          take: 10,
        }),
      [],
    ),
    safe(
      () =>
        prisma.lead.findMany({
          where: { ...scope, resourceAttribute: "VALID", conversionStage: "试听" },
          orderBy: { nextActionDueAt: "asc" },
          take: 10,
        }),
      [],
    ),
    safe(
      () =>
        prisma.lead.findMany({
          where: { ...scope, conversionStage: "已签约", updatedAt: { gte: monthStart } },
          orderBy: { updatedAt: "desc" },
          take: 10,
        }),
      [],
    ),
    safe(
      () =>
        prisma.lead.findMany({
          where: scope,
          select: {
            resourceAttribute: true, conversionStage: true,
            primaryChannelId: true, createdAt: true,
            primaryChannel: { select: { name: true, parent: { select: { name: true, parent: { select: { name: true } } } } } },
          },
        }),
      [] as any[],
    ),
    safe(
      async () => {
        const groups = await prisma.lead.groupBy({
          by: ["resourceAttribute"],
          where: scope,
          _count: { _all: true },
        });
        return Object.fromEntries(groups.map((g) => [g.resourceAttribute, g._count?._all ?? 0]));
      },
      {} as Record<string, number>,
    ),
    safe(
      async () => {
        const groups = await prisma.lead.groupBy({
          by: ["primaryChannelId"],
          where: scope,
          _count: { _all: true },
        });
        // Resolve channel names
        const ids = groups.map((g) => g.primaryChannelId).filter(Boolean) as string[];
        const channels = ids.length
          ? await prisma.channel.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
          : [];
        const nameById = new Map(channels.map((c) => [c.id, c.name]));
        return groups
          .map((g) => ({
            source: g.primaryChannelId ? (nameById.get(g.primaryChannelId) ?? "未知") : "未填",
            count: g._count?._all ?? 0,
          }))
          .sort((a, b) => b.count - a.count);
      },
      [] as { source: string; count: number }[],
    ),
  ]);

  const wonThisWeek = (allLeads as any[]).filter(
    (l) => l.conversionStage === "已签约" && new Date(l.createdAt) >= weekStart,
  ).length;
  const newThisWeek = (allLeads as any[]).filter(
    (l) => new Date(l.createdAt) >= weekStart,
  ).length;

  const isEmpty = (allLeads as any[]).length === 0;

  return {
    me,
    todayFocus,
    trials,
    recentWon,
    funnel: isEmpty
      ? { PENDING: 4, VALID: 8, INVALID: 2, EXPIRED: 1 }
      : funnel,
    sources: isEmpty
      ? [
          { source: "@知日塾日本留学", count: 7 },
          { source: "公众号",          count: 4 },
          { source: "员工推荐",        count: 3 },
          { source: "@CHIART知日美术", count: 2 },
          { source: "薛老师",          count: 2 },
        ]
      : sources,
    wonThisWeek: isEmpty ? 2 : wonThisWeek,
    newThisWeek: isEmpty ? 6 : newThisWeek,
    isEmpty,
    funnelOrder: RESOURCE_ATTRIBUTE_ORDER,
  };
}
