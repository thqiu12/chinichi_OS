import Link from "next/link";
import { getStudentHome } from "@/services/student-home";
import { TodayHero } from "@/components/student/TodayHero";
import { GrowthRing } from "@/components/cards/GrowthRing";
import { EncouragementCard } from "@/components/student/EncouragementCard";
import { Avatar } from "@/components/ui/Avatar";
import { greet, fmtDateTime, fmtDate, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentHomePage() {
  const d = await getStudentHome();

  return (
    <main className="pb-6">
      <div className="px-5 pt-8">
        <p className="text-sm text-slate-500">
          {greet()}，<b className="text-slate-900">{d.student.name}</b> 👋
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          今天最重要的一件事
        </h1>
      </div>

      <TodayHero
        task={
          d.todayTopTask
            ? { id: d.todayTopTask.id, title: d.todayTopTask.title, dueAt: d.todayTopTask.dueAt ?? null }
            : null
        }
      />

      <section className="px-5 mt-5 grid grid-cols-2 gap-3">
        <GrowthRing value={d.student.growthScore} stage={d.student.stage} />
        <EncouragementCard text={d.aiEncouragement} mentor={d.mentor} />
      </section>

      <section className="px-5 mt-5 space-y-3">
        {d.nextLesson && (
          <Link href="/student/schedule" className="block rounded-2xl bg-white shadow-soft p-4">
            <div className="text-xs text-slate-500">下一节课</div>
            <div className="font-medium mt-1">{d.nextLesson.subject}</div>
            <div className="text-sm text-slate-500">
              {fmtDateTime(d.nextLesson.startsAt)} · {d.nextLesson.teacherName}
            </div>
          </Link>
        )}

        {d.upcomingDeadline && (
          <Link href="/student/deadlines"
                className="block rounded-2xl bg-rose-50 p-4">
            <div className="text-xs text-rose-600">即将截止</div>
            <div className="font-medium mt-1">{d.upcomingDeadline.title}</div>
            <div className="text-sm text-rose-500">
              {fmtDate(d.upcomingDeadline.dueAt)} · 还剩 {daysUntil(d.upcomingDeadline.dueAt)} 天
            </div>
          </Link>
        )}
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-medium text-slate-500 mb-2">老师最近说</h2>
        <div className="space-y-3">
          {d.recentFeedbacks.map((f) => (
            <div key={f.id} className="rounded-2xl bg-white shadow-soft p-4">
              <div className="text-xs text-slate-500">
                {f.teacherName} · {fmtDate(f.createdAt)}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{f.aiBody}</p>
              {f.aiPraise && (
                <p className="mt-2 text-amber-700 text-sm">✨ {f.aiPraise}</p>
              )}
            </div>
          ))}
          {d.recentFeedbacks.length === 0 && (
            <div className="text-sm text-slate-400">还没有反馈</div>
          )}
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-sm font-medium text-slate-500 mb-2">本周谁在关注你</h2>
        <div className="flex -space-x-2">
          {d.watchers.map((w) => (
            <span key={w.id} className="rounded-full ring-2 ring-white inline-block">
              <Avatar name={w.name} src={w.avatarUrl ?? undefined} size={36} />
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
