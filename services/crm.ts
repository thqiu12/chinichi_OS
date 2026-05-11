import { prisma, safe } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { addDays, startOfDay } from "@/lib/utils";

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
          where: { ...scope, nextActionDueAt: { lte: tomorrow }, status: { notIn: ["WON", "LOST"] } },
          orderBy: { nextActionDueAt: "asc" },
          take: 10,
        }),
      [],
    ),
    safe(
      () =>
        prisma.lead.findMany({
          where: { ...scope, status: "TRIAL" },
          orderBy: { nextActionDueAt: "asc" },
          take: 10,
        }),
      [],
    ),
    safe(
      () =>
        prisma.lead.findMany({
          where: { ...scope, status: "WON", updatedAt: { gte: monthStart } },
          orderBy: { updatedAt: "desc" },
          take: 10,
        }),
      [],
    ),
    safe(
      () => prisma.lead.findMany({ where: scope, select: { status: true, sourceChannel: true, createdAt: true } }),
      [],
    ),
    safe(
      async () => {
        const groups = await prisma.lead.groupBy({
          by: ["status"],
          where: scope,
          _count: { _all: true },
        });
        return Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
      },
      {} as Record<string, number>,
    ),
    safe(
      async () => {
        const groups = await prisma.lead.groupBy({
          by: ["sourceChannel"],
          where: scope,
          _count: { _all: true },
        });
        return groups
          .map((g) => ({ source: g.sourceChannel ?? "未填", count: g._count._all }))
          .sort((a, b) => b.count - a.count);
      },
      [] as { source: string; count: number }[],
    ),
  ]);

  const wonThisWeek = allLeads.filter((l: any) => l.status === "WON" && new Date(l.createdAt) >= weekStart).length;
  const newThisWeek = allLeads.filter((l: any) => new Date(l.createdAt) >= weekStart).length;

  // Fallback demo numbers if no data at all
  const isEmpty = allLeads.length === 0;

  return {
    me,
    todayFocus,
    trials,
    recentWon,
    funnel: isEmpty ? { NEW: 4, CONTACTED: 6, TRIAL: 3, NEGOTIATING: 5, WON: 2, LOST: 2 } : funnel,
    sources: isEmpty
      ? [
          { source: "小红书", count: 7 },
          { source: "公众号", count: 4 },
          { source: "推荐",   count: 3 },
          { source: "B站",    count: 2 },
          { source: "搜索",   count: 2 },
        ]
      : sources,
    wonThisWeek: isEmpty ? 2 : wonThisWeek,
    newThisWeek: isEmpty ? 6 : newThisWeek,
    isEmpty,
  };
}
