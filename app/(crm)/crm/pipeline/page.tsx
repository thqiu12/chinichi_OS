import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { PipelineCard } from "@/components/crm/PipelineCard";
import { CONVERSION_STAGES } from "@/lib/dict";

export const dynamic = "force-dynamic";

const COLUMN_TONE: Record<string, string> = {
  "挖需中":            "bg-slate-100",
  "机会资源":          "bg-amber-50",
  "长线资源":          "bg-violet-50",
  "当月分配当月签约":   "bg-emerald-100",
  "输单":              "bg-slate-200",
};

export default async function PipelinePage() {
  // Pipeline shows only the inner-most tier: 资源属性=有效 AND 顾问确认=已确认意向.
  // Per PRD, this is where the 5-stage transition lives.
  const leads = await safe(
    () =>
      prisma.lead.findMany({
        where: {
          resourceAttribute: "VALID",
          advisorConfirmation: "INTENT_CONFIRMED",
        },
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
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline · 有效 · 已确认意向</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            只展示「资源属性=有效 ∧ 顾问确认=已确认意向」的资源。点 ←/→ 推/退一档。
          </p>
        </div>
        <Link href="/crm/leads/new"
              className="rounded-full bg-emerald-600 text-white px-4 h-9 inline-flex items-center text-sm">
          + 新建资源
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 leading-relaxed">
        <b>层级提醒</b>：资源属性 = 待判定/无效/失效 的资源不会出现在这里；
        资源属性 = 有效 但 顾问确认 = 待判定/失效 的也不会。请在资源详情里写"咨询顾问跟进"
        时把 顾问确认 选为「已确认意向」后，再选下方的转化阶段。
      </div>
    </div>
  );
}

function demoLeads(): any[] {
  const add = (n: number) => new Date(Date.now() + n * 86400000);
  return [
    { id: "d1", name: "周晓雯",     conversionStage: "长线资源", primaryChannel: { name: "@知日塾日本留学" }, degreeType: "大学院-修士", nextAction: "本周三试听后跟进", nextActionDueAt: add(3),  conversionProbability: 70 },
    { id: "d2", name: "刘星辰",     conversionStage: "机会资源", primaryChannel: { name: "公众号" },           degreeType: "学部",         nextAction: "确认试听课时间", nextActionDueAt: add(1),  conversionProbability: 55 },
    { id: "d3", name: "高奈奈",     conversionStage: "挖需中",    primaryChannel: { name: "@CHIART知日美术" }, degreeType: "学部",         nextAction: "约一次面咨",     nextActionDueAt: add(5),  conversionProbability: 30 },
    { id: "d6", name: "王宇翔",     conversionStage: "当月分配当月签约", primaryChannel: { name: "员工推荐" }, degreeType: "大学院-修士", nextAction: null,             nextActionDueAt: null,    conversionProbability: 100 },
    { id: "d7", name: "Sato Aoi",   conversionStage: "机会资源", primaryChannel: { name: "搜索" },             degreeType: "学部",         nextAction: "出合同",         nextActionDueAt: add(4),  conversionProbability: 80 },
  ];
}
