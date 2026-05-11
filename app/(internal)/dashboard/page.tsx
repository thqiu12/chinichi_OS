import Link from "next/link";
import { getDashboard } from "@/services/dashboard";
import { TodayFocusCard } from "@/components/cards/TodayFocusCard";
import { RiskCard } from "@/components/cards/RiskCard";
import { DeadlineCard } from "@/components/cards/DeadlineCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { fmtTime, daysAgo, greet } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboard();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greet()}，{d.me.name} ☀️
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            今天有 <b>{d.todayFocus.length}</b> 位学生需要你推进，
            <b className="text-rose-600"> {d.atRisk.length} </b> 位处于风险。
          </p>
        </div>
        <Link href="/followups/new"
              className="rounded-full bg-slate-900 text-white px-4 h-9 inline-flex items-center text-sm">
          + 写跟进
        </Link>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TodayFocusCard items={d.todayFocus as any} />
        <RiskCard items={d.atRisk as any} />
        <DeadlineCard items={d.upcomingDeadlines as any} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>今日课程</CardTitle></CardHeader>
          <CardContent>
            {d.todayLessons.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">今天没有课</div>
            )}
            <ul className="space-y-2">
              {d.todayLessons.map((l) => (
                <li key={l.id} className="flex justify-between text-sm">
                  <span>
                    <span className="text-slate-500">{fmtTime(l.startsAt)}</span>
                    <span className="ml-3 font-medium">{l.subject}</span>
                  </span>
                  <span className="text-slate-400">{l.classroom ?? "—"}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>逾期 TODO</CardTitle></CardHeader>
          <CardContent>
            {d.overdueTodos.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">没有逾期 ✨</div>
            )}
            <ul className="space-y-1">
              {d.overdueTodos.map((t) => (
                <li key={t.id} className="flex justify-between text-sm">
                  <Link href={t.studentId ? `/students/${t.studentId}?tab=todos` : "#"}
                        className="hover:underline truncate">
                    {t.title}
                    {t.student && <span className="text-slate-400 ml-2">· {t.student.name}</span>}
                  </Link>
                  {t.dueAt && <span className="text-rose-500 shrink-0">{daysAgo(t.dueAt)} 天前</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader><CardTitle>本周里程碑 🎉</CardTitle></CardHeader>
          <CardContent>
            {d.weekMilestones.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">本周还没有里程碑</div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {d.weekMilestones.map((m) => (
                  <div key={m.id} className="min-w-[220px] rounded-2xl bg-amber-50 px-4 py-3">
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{m.student?.name}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <Stat label="在读学生" value={d.counts.students} />
        <Stat label="进行中线索" value={d.counts.leads} />
        <Stat label="本周 Deadline" value={d.counts.dueWeek} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
