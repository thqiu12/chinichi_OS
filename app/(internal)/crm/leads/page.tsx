import { prisma, safe } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NEW: "新", CONTACTED: "已联系", TRIAL: "试听",
  NEGOTIATING: "意向", WON: "成交", LOST: "流失",
};

export default async function LeadsPage() {
  const leads = await safe(
    () => prisma.lead.findMany({ orderBy: { updatedAt: "desc" } }),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">CRM · 线索</h1>
        <span className="text-sm text-slate-500">{leads.length} 条</span>
      </header>

      <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">渠道</th>
              <th className="px-4 py-3 font-medium">目标</th>
              <th className="px-4 py-3 font-medium">阶段</th>
              <th className="px-4 py-3 font-medium">下一步</th>
              <th className="px-4 py-3 font-medium">截止</th>
              <th className="px-4 py-3 font-medium">概率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{l.name}</td>
                <td className="px-4 py-3 text-slate-600">{l.sourceChannel ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{l.targetDegree ?? "—"}</td>
                <td className="px-4 py-3"><Badge>{STATUS_LABEL[l.status]}</Badge></td>
                <td className="px-4 py-3 max-w-[260px] truncate">{l.nextAction ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {l.nextActionDueAt ? fmtDate(l.nextActionDueAt) : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">{l.conversionProbability}%</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                暂无线索
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
