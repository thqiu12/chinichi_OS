import { prisma, safe } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { addDays, startOfDay } from "@/lib/utils";

export async function getDashboard() {
  const me = await currentUser();
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const weekAgo = addDays(today, -7);

  // Mentor scope = students they own. Admin sees everything.
  const mentorScope =
    me.role === "ADMIN" || me.id === "demo" ? {} : { mentorId: me.id };
  const teacherScope =
    me.role === "ADMIN" || me.id === "demo" ? {} : { teacherId: me.id };

  const [
    atRisk,
    todayFocus,
    upcomingDeadlines,
    todayLessons,
    overdueTodos,
    weekMilestones,
    counts,
  ] = await Promise.all([
    safe(
      () =>
        prisma.student.findMany({
          where: { ...mentorScope, riskLevel: { in: ["YELLOW", "RED"] } },
          orderBy: [{ riskLevel: "desc" }, { lastFollowUpAt: "asc" }],
          take: 8,
          include: { division: true },
        }),
      [],
    ),
    safe(
      () =>
        prisma.student.findMany({
          where: { ...mentorScope, nextActionDueAt: { lte: tomorrow } },
          orderBy: { nextActionDueAt: "asc" },
          take: 8,
          include: { division: true },
        }),
      [],
    ),
    safe(
      () =>
        prisma.deadline.findMany({
          where: {
            completedAt: null,
            dueAt: { gte: today, lte: weekEnd },
            student: mentorScope,
          },
          orderBy: { dueAt: "asc" },
          include: { student: { include: { division: true } } },
          take: 10,
        }),
      [],
    ),
    safe(
      () =>
        prisma.lesson.findMany({
          where: { ...teacherScope, startsAt: { gte: today, lt: tomorrow } },
          orderBy: { startsAt: "asc" },
          include: { teacher: true, students: { include: { student: true } } },
        }),
      [],
    ),
    safe(
      () =>
        prisma.todo.findMany({
          where: {
            status: { not: "DONE" },
            dueAt: { lt: today },
            OR: [
              { assigneeId: me.id },
              { student: mentorScope },
            ],
          },
          orderBy: { dueAt: "asc" },
          include: { student: true },
          take: 8,
        }),
      [],
    ),
    safe(
      () =>
        prisma.timelineEvent.findMany({
          where: {
            kind: "MILESTONE",
            occurredAt: { gte: weekAgo },
            student: mentorScope,
          },
          orderBy: { occurredAt: "desc" },
          include: { student: true },
          take: 12,
        }),
      [],
    ),
    safe(
      async () => {
        const [students, leads, dueWeek] = await Promise.all([
          prisma.student.count({ where: mentorScope }),
          prisma.lead.count({ where: { status: { notIn: ["WON", "LOST"] } } }),
          prisma.deadline.count({
            where: { completedAt: null, dueAt: { lte: weekEnd } },
          }),
        ]);
        return { students, leads, dueWeek };
      },
      { students: 0, leads: 0, dueWeek: 0 },
    ),
  ]);

  return {
    me,
    atRisk,
    todayFocus,
    upcomingDeadlines,
    todayLessons,
    overdueTodos,
    weekMilestones,
    counts,
  };
}
