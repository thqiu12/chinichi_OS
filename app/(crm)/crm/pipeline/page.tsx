import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { PipelineCard } from "@/components/crm/PipelineCard";
import { CONVERSION_STAGES } from "@/lib/dict";

export const dynamic = "force-dynamic";

const COLUMN_TONE: Record<string, string> = {
  "初步接触": "bg-slate-100",
  "深度沟通": "bg-blue-50",
  "试听":     "bg-amber-50",
  "意向待定": "bg-emerald-50",
  "报价":     "bg-emerald-50",
  "已签约":   "bg-emerald-100",
  "老生续费": "bg-emerald-100",
  "输单":     "bg-slate-100",
};

export default async function PipelinePage() {
  // Only show VALID leads with a stage (Phase 1: PENDING/INVALID/EXPIRED live elsewhere)
  const leads = await safe(
    () =>
      prisma.lead.findMany({
        where: { resourceAttribute: "VALID" },
        orderBy: { updatedAt: "desc" },
        include: { primaryChannel: true },
      }),
    demoLeads(),
  );

  const byStage: Record<string, any[]> = Object.fromEntries(CONVERSION_STAGES.map((s) => [s, [] as any[]]));
  for (const l of leads) {
    if (l.conversionStage && l.conversionStage in byStage) byStage[l.conversionStage].push(l);
  }

  return (
    <div className="px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline · 有效资源转化阶段</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            点 ←/→ 推/退一档，或下拉直接跳到任意阶段。
          </p>
        </div>
        <Link href="/crm/leads/new"
              className="rounded-full bg-emerald-600 text-white px-4 h-9 inline-flex items-center text-sm">
          + 新建资源
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {CONVERSION_STAGES.map((stage) => {
          const items = byStage[stage] ?? [];
          return (
            <div key={stage} className={`rounded-2xl ${COLUMN_TONE[stage] ?? "bg-slate-100"} p-3 min-h-[440px]`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-sm font-medium">{stage}</div>
                <div className="text-xs text-slate-500">{items.length}</div>
              </div>
              <ul className="space-y-2">
                {items.map((l) => <li key={l.id}><PipelineCard lead={l} /></li>)}
                {items.length === 0 && (
                  <li className="text-[11px] text-slate-400 text-center py-6">空</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function demoLeads(): any[] {
  const add = (n: number) => new Date(Date.now() + n * 86400000);
  return [
    { id: "d1", name: "周晓雯",     conversionStage: "意向待定", primaryChannel: { name: "@知日塾日本留学" }, degreeType: "大学院-修士", nextAction: "本周三试听后跟进", nextActionDueAt: add(3),  conversionProbability: 70 },
    { id: "d2", name: "刘星辰",     conversionStage: "试听",     primaryChannel: { name: "公众号" },           degreeType: "学部",         nextAction: "确认试听课时间", nextActionDueAt: add(1),  conversionProbability: 55 },
    { id: "d3", name: "高奈奈",     conversionStage: "初步接触", primaryChannel: { name: "@CHIART知日美术" }, degreeType: "学部",         nextAction: "约一次面咨",     nextActionDueAt: add(5),  conversionProbability: 30 },
    { id: "d4", name: "Tanaka Yui", conversionStage: "初步接触", primaryChannel: { name: "员工推荐" },         degreeType: "大学院-修士", nextAction: "首次电话沟通",   nextActionDueAt: add(2),  conversionProbability: 15 },
    { id: "d5", name: "陈思琪",     conversionStage: "深度沟通", primaryChannel: { name: "薛老师" },           degreeType: "学部",         nextAction: "添加微信",       nextActionDueAt: add(0),  conversionProbability: 10 },
    { id: "d6", name: "王宇翔",     conversionStage: "已签约",   primaryChannel: { name: "员工推荐" },         degreeType: "大学院-修士", nextAction: null,             nextActionDueAt: null,    conversionProbability: 100 },
    { id: "d7", name: "Sato Aoi",   conversionStage: "报价",     primaryChannel: { name: "搜索" },             degreeType: "学部",         nextAction: "出合同",         nextActionDueAt: add(4),  conversionProbability: 80 },
  ];
}
