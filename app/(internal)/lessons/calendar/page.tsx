import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { fmtTime, fmtDate } from "@/lib/format";
import { addDays, startOfDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LessonsCalendarPage() {
  const start = startOfDay();
  const end = addDays(start, 7);

  const lessons = await safe(
    () =>
      prisma.lesson.findMany({
        where: { startsAt: { gte: start, lt: end } },
        orderBy: { startsAt: "asc" },
        include: { teacher: true, students: { include: { student: true } } },
      }),
    [],
  );

  const days: { date: Date; items: typeof lessons }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    days.push({ date: d, items: lessons.filter((l) => sameDay(l.startsAt, d)) });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">课程 · 本周</h1>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day) => (
          <div key={day.date.toISOString()} className="rounded-2xl bg-white border border-slate-100 p-3 min-h-[180px]">
            <div className="text-xs text-slate-500">{fmtDate(day.date)}</div>
            <div className="mt-2 space-y-2">
              {day.items.length === 0 ? (
                <div className="text-[11px] text-slate-300">—</div>
              ) : day.items.map((l) => (
                <Link key={l.id} href={`/lessons/${l.id}/feedback`}
                      className="block rounded-lg bg-brand-50 hover:bg-brand-100 px-2 py-2">
                  <div className="text-[11px] text-brand-700">{fmtTime(l.startsAt)} · {l.classroom ?? "—"}</div>
                  <div className="text-sm font-medium">{l.subject}</div>
                  <div className="text-[11px] text-slate-500">
                    {l.teacher.name} · {l.students.length} 人
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}
