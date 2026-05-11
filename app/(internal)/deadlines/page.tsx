import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { daysUntil, fmtDate } from "@/lib/format";
import { addDays, startOfDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const today = startOfDay();
  const dls = await safe(
    () =>
      prisma.deadline.findMany({
        where: { completedAt: null },
        orderBy: { dueAt: "asc" },
        include: { student: true },
      }),
    [],
  );

  const buckets = {
    overdue: dls.filter((d) => d.dueAt < today),
    week:    dls.filter((d) => d.dueAt >= today && d.dueAt < addDays(today, 7)),
    month:   dls.filter((d) => d.dueAt >= addDays(today, 7) && d.dueAt < addDays(today, 30)),
    later:   dls.filter((d) => d.dueAt >= addDays(today, 30)),
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Deadline 总览</h1>
      <Bucket title="已逾期"   tone="rose"   items={buckets.overdue} />
      <Bucket title="本周"     tone="amber"  items={buckets.week} />
      <Bucket title="本月"     tone="slate"  items={buckets.month} />
      <Bucket title="未来"     tone="slate"  items={buckets.later} />
    </div>
  );
}

function Bucket({
  title, items, tone,
}: {
  title: string; tone: "rose"|"amber"|"slate";
  items: { id: string; title: string; dueAt: Date; student: { id: string; name: string } }[];
}) {
  const head = {
    rose:  "text-rose-700",
    amber: "text-amber-700",
    slate: "text-slate-700",
  }[tone];
  return (
    <section>
      <h2 className={`text-sm font-medium mb-2 ${head}`}>{title} · {items.length}</h2>
      {items.length === 0 ? (
        <div className="text-sm text-slate-400">无</div>
      ) : (
        <ul className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100">
          {items.map((d) => {
            const left = daysUntil(d.dueAt);
            return (
              <li key={d.id}>
                <Link href={`/students/${d.student.id}?tab=deadlines`}
                      className="flex justify-between px-4 py-3 text-sm hover:bg-slate-50">
                  <span>
                    <span className="font-medium">{d.title}</span>
                    <span className="text-[11px] text-slate-400 ml-2">{d.student.name}</span>
                  </span>
                  <span className="text-slate-500">
                    {fmtDate(d.dueAt)} · {left < 0 ? `逾期 ${-left}d` : left === 0 ? "今天" : `${left}d`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
