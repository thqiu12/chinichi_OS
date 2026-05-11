import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { fmtDate, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NEW: "新", CONTACTED: "已联系", TRIAL: "试听",
  NEGOTIATING: "意向", WON: "成交", LOST: "流失",
};

const STATUS_CLS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-blue-50 text-blue-700",
  TRIAL: "bg-amber-50 text-amber-700",
  NEGOTIATING: "bg-emerald-50 text-emerald-700",
  WON: "bg-emerald-600 text-white",
  LOST: "bg-slate-200 text-slate-500",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const where = searchParams.status ? { status: searchParams.status as any } : {};
  const leads = await safe(
    () => prisma.lead.findMany({ where, orderBy: { updatedAt: "desc" } }),
    demoLeads(),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">{leads.length} 条 · 销售工作台</p>
        </div>
        <Link href="/crm/leads/new"
              className="rounded-full bg-emerald-600 text-white px-4 h-9 inline-flex items-center text-sm">
          + 新建 Lead
        </Link>
      </header>

      <div className="flex gap-2 text-xs">
        <Filter href="/crm/leads">全部</Filter>
        <Filter href="/crm/leads?status=NEW">新</Filter>
        <Filter href="/crm/leads?status=CONTACTED">已联系</Filter>
        <Filter href="/crm/leads?status=TRIAL">试听</Filter>
        <Filter href="/crm/leads?status=NEGOTIATING">意向</Filter>
        <Filter href="/crm/leads?status=WON">成交</Filter>
      </div>

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
            {leads.map((l) => {
              const days = l.nextActionDueAt ? daysUntil(l.nextActionDueAt) : null;
              return (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/crm/leads/${l.id}`} className="hover:underline">
                      {l.name}
                    </Link>
                    <div className="text-[11px] text-slate-400 mt-0.5">{l.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.sourceChannel ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{l.targetDegree ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_CLS[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 max-w-[260px] truncate">{l.nextAction ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {l.nextActionDueAt ? (
                      <span className={days !== null && days <= 0 ? "text-rose-600" : ""}>
                        {fmtDate(l.nextActionDueAt)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{l.conversionProbability}%</td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">暂无线索</td></tr>
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

function demoLeads(): any[] {
  const add = (n: number) => new Date(Date.now() + n * 86400000);
  return [
    { id: "d1", name: "周晓雯", phone: "13800001111", sourceChannel: "小红书", targetDegree: "大学院", status: "NEGOTIATING" as const, nextAction: "本周三试听后跟进", nextActionDueAt: add(3), conversionProbability: 70 },
    { id: "d2", name: "刘星辰", phone: "13800002222", sourceChannel: "公众号", targetDegree: "学部",   status: "TRIAL"       as const, nextAction: "确认试听课时间", nextActionDueAt: add(1), conversionProbability: 55 },
    { id: "d3", name: "高奈奈", phone: "13800003333", sourceChannel: "B站",    targetDegree: "美术",   status: "CONTACTED"   as const, nextAction: "约一次面咨",     nextActionDueAt: add(5), conversionProbability: 30 },
    { id: "d4", name: "Tanaka Yui", phone: "08012345678", sourceChannel: "推荐", targetDegree: "大学院", status: "NEW"        as const, nextAction: "首次电话沟通",   nextActionDueAt: add(2), conversionProbability: 15 },
    { id: "d5", name: "李铭",   phone: "13800005555", sourceChannel: "小红书", targetDegree: "音乐",   status: "LOST"        as const, nextAction: null, nextActionDueAt: null, conversionProbability: 0 },
  ];
}
