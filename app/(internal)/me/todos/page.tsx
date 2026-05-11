import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { fmtDate, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyTodosPage() {
  const me = await currentUser();
  const todos = await safe(
    () =>
      prisma.todo.findMany({
        where: {
          ownerType: "STAFF",
          OR: [{ assigneeId: me.id }, { assigneeId: null }],
          status: { not: "DONE" },
        },
        orderBy: { dueAt: "asc" },
        include: { student: true },
      }),
    [],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">我的待办</h1>
      {todos.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 py-12 text-center text-sm text-slate-400">
          没有待办 ✨
        </div>
      ) : (
        <ul className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100">
          {todos.map((t) => {
            const left = t.dueAt ? daysUntil(t.dueAt) : 999;
            return (
              <li key={t.id}>
                <Link
                  href={t.studentId ? `/students/${t.studentId}` : "#"}
                  className="flex justify-between items-center px-4 py-3 text-sm hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium">{t.title}</div>
                    {t.student && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{t.student.name}</div>
                    )}
                  </div>
                  {t.dueAt && (
                    <span className={left <= 0 ? "text-rose-600" : "text-slate-500"}>
                      {fmtDate(t.dueAt)} · {left <= 0 ? "今天" : `${left}d`}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
