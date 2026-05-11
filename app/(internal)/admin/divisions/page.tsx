import { prisma, safe } from "@/lib/db";
import { divisionLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DivisionsPage() {
  const divs = await safe(
    () =>
      prisma.division.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { students: true, members: true } },
        },
      }),
    [],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">事业部</h1>
      <p className="text-sm text-slate-500">
        共享部门（如 日语组）支持跨事业部授课。
      </p>
      <ul className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100">
        {divs.map((d) => (
          <li key={d.id} className="px-4 py-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{d.name} <span className="text-[11px] text-slate-400">{divisionLabel(d.kind)}</span></div>
              <div className="text-[11px] text-slate-400">
                {d.isShared ? "共享部门" : "独立事业部"} · {d._count.students} 学生 · {d._count.members} 成员
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
