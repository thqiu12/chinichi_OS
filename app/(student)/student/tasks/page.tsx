import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { currentStudent } from "@/lib/auth";
import { fmtDate, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentTasksPage() {
  const s = await currentStudent();
  const todos = s
    ? await safe(
        () =>
          prisma.todo.findMany({
            where: { studentId: s.id, ownerType: "STUDENT" },
            orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          }),
        [],
      )
    : demoTodos();

  const groups = {
    today:    todos.filter((t) => t.status !== "DONE" && t.dueAt && daysUntil(t.dueAt) <= 0),
    soon:     todos.filter((t) => t.status !== "DONE" && t.dueAt && daysUntil(t.dueAt) > 0 && daysUntil(t.dueAt) <= 7),
    later:    todos.filter((t) => t.status !== "DONE" && (!t.dueAt || daysUntil(t.dueAt) > 7)),
    done:     todos.filter((t) => t.status === "DONE"),
  };

  return (
    <main className="px-5 pt-8 pb-10 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">我的任务</h1>

      <Section title="今天" tone="rose"  items={groups.today} />
      <Section title="本周" tone="amber" items={groups.soon} />
      <Section title="之后" tone="slate" items={groups.later} />
      {groups.done.length > 0 && (
        <Section title="已完成" tone="slate" items={groups.done.slice(0, 5)} muted />
      )}
    </main>
  );
}

function Section({
  title, tone, items, muted,
}: {
  title: string; tone: "rose"|"amber"|"slate"; muted?: boolean;
  items: { id: string; title: string; dueAt: Date | null; status: string }[];
}) {
  const head = { rose: "text-rose-700", amber: "text-amber-700", slate: "text-slate-700" }[tone];
  return (
    <section>
      <h2 className={`text-sm font-medium mb-2 ${head}`}>{title} · {items.length}</h2>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400">无</div>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/student/tasks/${t.id}`}
                    className={`block rounded-2xl bg-white shadow-soft px-4 py-3 ${muted ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{t.title}</div>
                  {t.dueAt && (
                    <span className="text-[11px] text-slate-500">{fmtDate(t.dueAt)}</span>
                  )}
                </div>
                {t.status === "DONE" && <div className="text-[11px] text-emerald-600 mt-1">✓ 已完成</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function demoTodos() {
  const now = new Date();
  const add = (d: number) => new Date(now.getTime() + d * 86400000);
  return [
    { id: "d1", title: "研究计划书第二节修改", dueAt: add(1),  status: "PENDING" as const },
    { id: "d2", title: "JLPT 模考阅读 1 套",   dueAt: add(3),  status: "PENDING" as const },
    { id: "d3", title: "单词本 100 词",        dueAt: add(0),  status: "PENDING" as const },
    { id: "d4", title: "作品集 5 张草图",      dueAt: add(7),  status: "PENDING" as const },
  ];
}
