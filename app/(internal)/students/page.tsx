import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Dot } from "@/components/ui/Badge";
import { divisionLabel, fmtDate, riskLabel, stageLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { risk?: string; stage?: string; division?: string };
}) {
  const where: any = {};
  if (searchParams.risk)
    where.riskLevel = { in: searchParams.risk.split(",") };
  if (searchParams.stage)
    where.stage = searchParams.stage;
  if (searchParams.division)
    where.division = { kind: searchParams.division };

  const students = await safe(
    () =>
      prisma.student.findMany({
        where,
        include: { division: true, mentor: true },
        orderBy: [{ riskLevel: "desc" }, { lastFollowUpAt: "asc" }],
      }),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">学生</h1>
        <span className="text-sm text-slate-500">{students.length} 人</span>
      </header>

      <div className="flex gap-2 text-xs">
        <Filter href="/students">全部</Filter>
        <Filter href="/students?risk=RED,YELLOW">风险中</Filter>
        <Filter href="/students?stage=APPLICATION">出愿期</Filter>
        <Filter href="/students?division=ART">美术</Filter>
        <Filter href="/students?division=GRADUATE">大学院</Filter>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">学生</th>
              <th className="px-4 py-3 font-medium">事业部</th>
              <th className="px-4 py-3 font-medium">阶段</th>
              <th className="px-4 py-3 font-medium">下一步</th>
              <th className="px-4 py-3 font-medium">风险</th>
              <th className="px-4 py-3 font-medium">最近跟进</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => {
              const r = riskLabel(s.riskLevel);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="flex items-center gap-2">
                      <Avatar name={s.name} size={28} />
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {s.targetSchool ?? "未设目标校"}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{divisionLabel(s.division.kind)}</td>
                  <td className="px-4 py-3 text-slate-600">{stageLabel(s.stage)}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[260px] truncate">
                    {s.nextAction ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={r.cls}>
                      <Dot className={r.dot} /> {r.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {s.lastFollowUpAt ? fmtDate(s.lastFollowUpAt) : "—"}
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                没有匹配的学生
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Filter({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
          className="rounded-full px-3 h-7 inline-flex items-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
      {children}
    </Link>
  );
}
