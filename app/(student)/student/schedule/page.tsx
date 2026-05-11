import { prisma, safe } from "@/lib/db";
import { currentStudent } from "@/lib/auth";
import { fmtDateTime, fmtTime, fmtDate } from "@/lib/format";
import { addDays, startOfDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentSchedulePage() {
  const s = await currentStudent();
  const start = startOfDay();
  const end = addDays(start, 14);

  const lessons = s
    ? await safe(
        () =>
          prisma.lesson.findMany({
            where: {
              students: { some: { studentId: s.id } },
              startsAt: { gte: start, lt: end },
            },
            orderBy: { startsAt: "asc" },
            include: { teacher: true },
          }),
        [],
      )
    : demoLessons();

  return (
    <main className="px-5 pt-8 pb-10 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">课程</h1>
      {lessons.length === 0 ? (
        <div className="text-sm text-slate-400">最近两周没有课</div>
      ) : (
        <ul className="space-y-2">
          {lessons.map((l) => (
            <li key={l.id} className="rounded-2xl bg-white shadow-soft p-4">
              <div className="text-xs text-slate-500">
                {fmtDate(l.startsAt)} · {fmtTime(l.startsAt)}
              </div>
              <div className="mt-1 font-medium">{l.subject}</div>
              <div className="text-xs text-slate-500">
                {l.teacher?.name ?? "—"}
                {(l as any).classroom && <> · {(l as any).classroom}</>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function demoLessons() {
  const now = new Date(); now.setHours(10, 0, 0, 0);
  const add = (h: number) => new Date(now.getTime() + h * 3600000);
  return [
    { id: "1", subject: "JLPT N1 阅读", startsAt: add(0),   teacher: { name: "山田先生" }, classroom: "201" },
    { id: "2", subject: "研究指导 1on1", startsAt: add(28), teacher: { name: "佐藤先生" }, classroom: "Lab" },
    { id: "3", subject: "口语练习",     startsAt: add(52),  teacher: { name: "鈴木先生" }, classroom: "Online" },
  ];
}
