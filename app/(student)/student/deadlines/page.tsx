import { prisma, safe } from "@/lib/db";
import { currentStudent } from "@/lib/auth";
import { fmtDate, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDeadlinesPage() {
  const s = await currentStudent();
  const dls = s
    ? await safe(
        () =>
          prisma.deadline.findMany({
            where: { studentId: s.id },
            orderBy: { dueAt: "asc" },
          }),
        [],
      )
    : demoDls();

  const upcoming = dls.filter((d) => !d.completedAt);
  const done = dls.filter((d) => d.completedAt);

  return (
    <main className="px-5 pt-8 pb-10 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Deadline</h1>

      <ul className="space-y-2">
        {upcoming.length === 0 && (
          <div className="text-sm text-slate-400">没有 deadline</div>
        )}
        {upcoming.map((d) => {
          const left = daysUntil(d.dueAt);
          const tone =
            left < 0 ? "bg-rose-50 text-rose-700"
            : left <= 3 ? "bg-amber-50 text-amber-700"
            : "bg-white";
          return (
            <li key={d.id} className={`rounded-2xl shadow-soft p-4 ${tone}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{d.title}</div>
                <div className="text-xs">
                  {left < 0 ? `逾期 ${-left}d` : left === 0 ? "今天" : `${left} 天`}
                </div>
              </div>
              <div className="text-[11px] mt-1 opacity-80">{fmtDate(d.dueAt)}</div>
            </li>
          );
        })}
      </ul>

      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-500 mb-2">已完成</h2>
          <ul className="space-y-2">
            {done.map((d) => (
              <li key={d.id} className="rounded-2xl bg-white/80 p-4 flex justify-between text-sm opacity-70">
                <span>{d.title}</span>
                <span className="text-emerald-600">✓ 已完成</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function demoDls() {
  const now = new Date();
  const add = (n: number) => new Date(now.getTime() + n * 86400000);
  return [
    { id: "1", title: "JLPT N1 报名截止", dueAt: add(5),  completedAt: null },
    { id: "2", title: "研究计划书 v2",    dueAt: add(14), completedAt: null },
    { id: "3", title: "出愿提交",         dueAt: add(60), completedAt: null },
  ];
}
