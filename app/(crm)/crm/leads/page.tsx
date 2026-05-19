import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { fmtDate, daysUntil } from "@/lib/format";
import { resourceAttrLabel, conversionStageLabel } from "@/lib/dict";

export const dynamic = "force-dynamic";

const ATTR_VALUES = ["PENDING","VALID","INVALID","EXPIRED"] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { attr?: string; stage?: string };
}) {
  const where: any = {};
  if (searchParams.attr && (ATTR_VALUES as readonly string[]).includes(searchParams.attr))
    where.resourceAttribute = searchParams.attr;
  if (searchParams.stage) where.conversionStage = searchParams.stage;

  const leads = await safe(
    () => prisma.lead.findMany({
      where, orderBy: { updatedAt: "desc" },
      include: { primaryChannel: true },
    }),
    demoLeads(),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">资源 (Leads)</h1>
          <p className="text-sm text-slate-500 mt-0.5">{leads.length} 条 · 销售工作台</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/leads/import"
                className="rounded-full border border-slate-200 hover:bg-slate-50 px-4 h-9 inline-flex items-center text-sm">
            ⬆ 批量导入
          </Link>
          <Link href="/crm/leads/new"
                className="rounded-full bg-emerald-600 text-white px-4 h-9 inline-flex items-center text-sm">
            + 新建资源
          </Link>
        </div>
      </header>

      <div className="flex gap-2 text-xs flex-wrap">
        <Filter href="/crm/leads">全部</Filter>
        <Filter href="/crm/leads?attr=PENDING">待判定</Filter>
        <Filter href="/crm/leads?attr=VALID">有效</Filter>
        <Filter href="/crm/leads?attr=INVALID">无效</Filter>
        <Filter href="/crm/leads?attr=EXPIRED">失效</Filter>
        <span className="mx-2 text-slate-300">|</span>
        <Filter href="/crm/leads?stage=试听">试听中</Filter>
        <Filter href="/crm/leads?stage=已签约">已签约</Filter>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">资源来源</th>
              <th className="px-4 py-3 font-medium">升学类型</th>
              <th className="px-4 py-3 font-medium">资源属性</th>
              <th className="px-4 py-3 font-medium">有效转化阶段</th>
              <th className="px-4 py-3 font-medium">下一步</th>
              <th className="px-4 py-3 font-medium">截止</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l: any) => {
              const days = l.nextActionDueAt ? daysUntil(l.nextActionDueAt) : null;
              const attr = resourceAttrLabel(l.resourceAttribute);
              const stage = conversionStageLabel(l.conversionStage);
              return (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/crm/leads/${l.id}`} className="hover:underline">
                      {l.name}
                    </Link>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      微信 {l.wechatId ?? "—"} · 电话 {l.phone ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.primaryChannel?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{l.degreeType ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={attr.cls}>{attr.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={stage.cls}>{stage.label}</Badge>
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate">{l.nextAction ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {l.nextActionDueAt ? (
                      <span className={days !== null && days <= 0 ? "text-rose-600" : ""}>
                        {fmtDate(l.nextActionDueAt)}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">暂无资源</td></tr>
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
    { id: "d1", name: "周晓雯", phone: "13800001111", wechatId: "zhouxw",
      primaryChannel: { name: "@知日塾日本留学" },
      degreeType: "大学院-修士",
      resourceAttribute: "VALID", conversionStage: "意向待定",
      nextAction: "本周三试听后跟进", nextActionDueAt: add(3) },
    { id: "d2", name: "刘星辰", phone: "13800002222", wechatId: "liu_xingchen",
      primaryChannel: { name: "公众号" },
      degreeType: "学部",
      resourceAttribute: "VALID", conversionStage: "试听",
      nextAction: "确认试听课时间", nextActionDueAt: add(1) },
    { id: "d3", name: "高奈奈", phone: "13800003333", wechatId: "gaonana",
      primaryChannel: { name: "@CHIART知日美术" },
      degreeType: "学部",
      resourceAttribute: "VALID", conversionStage: "初步接触",
      nextAction: "约一次面咨", nextActionDueAt: add(5) },
    { id: "d4", name: "Tanaka Yui", phone: "08012345678", wechatId: "tanaka_yui",
      primaryChannel: { name: "员工推荐" },
      degreeType: "大学院-修士",
      resourceAttribute: "PENDING", conversionStage: null,
      nextAction: "首次电话沟通", nextActionDueAt: add(2) },
    { id: "d5", name: "李铭", phone: "13800005555",
      primaryChannel: { name: "@知日塾日本留学" },
      degreeType: "大学院-修士",
      resourceAttribute: "INVALID", conversionStage: null,
      nextAction: null, nextActionDueAt: null },
    { id: "d6", name: "王宇翔", phone: "13800007777", wechatId: "wangyuxiang",
      primaryChannel: { name: "员工推荐" },
      degreeType: "大学院-修士",
      resourceAttribute: "VALID", conversionStage: "已签约",
      nextAction: null, nextActionDueAt: null },
  ];
}
