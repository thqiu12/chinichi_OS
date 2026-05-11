"use client";
import Link from "next/link";
import { daysUntil, fmtDate } from "@/lib/format";

export function TodayHero({
  task,
}: {
  task: { id: string; title: string; dueAt: Date | null } | null;
}) {
  if (!task) {
    return (
      <Link
        href="/student/tasks"
        className="block mx-5 mt-4 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-white p-6 shadow-card"
      >
        <div className="text-sm/6 opacity-90">今天没有待办</div>
        <div className="text-xl font-semibold mt-1">放松一下，明天继续 🌿</div>
      </Link>
    );
  }
  const left = task.dueAt ? daysUntil(task.dueAt) : 999;
  const urgency =
    left < 0 ? "已逾期" : left === 0 ? "今天截止" : `还剩 ${left} 天`;

  return (
    <Link
      href={`/student/tasks/${task.id}`}
      className="block mx-5 mt-4 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-white p-6 shadow-card active:scale-[.99] transition"
    >
      <div className="text-sm/6 opacity-90">今天最重要的一件事</div>
      <div className="text-xl font-semibold mt-1 leading-snug">{task.title}</div>
      <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs">
        ⏱ {urgency}{task.dueAt ? ` · ${fmtDate(task.dueAt)}` : ""}
      </div>
    </Link>
  );
}
