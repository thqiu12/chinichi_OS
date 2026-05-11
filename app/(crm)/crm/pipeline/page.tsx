import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { PipelineCard } from "@/components/crm/PipelineCard";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { v: "NEW",         label: "新",     tone: "bg-slate-100"   },
  { v: "CONTACTED",   label: "已联系", tone: "bg-blue-50"     },
  { v: "TRIAL",       label: "试听",   tone: "bg-amber-50"    },
  { v: "NEGOTIATING", label: "意向",   tone: "bg-emerald-50"  },
  { v: "WON",         label: "成交",   tone: "bg-emerald-100" },
] as const;

export default async function PipelinePage() {
  const leads = await safe(
    () => prisma.lead.findMany({ orderBy: { updatedAt: "desc" } }),
    demoLeads(),
  );

  const byCol: Record<string, any[]> = Object.fromEntries(COLUMNS.map((c) => [c.v, []]));
  for (const l of leads) {
    if (l.status in byCol) byCol[l.status].push(l);
  }

  return (
    <div className="px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            点 ←/→ 推/退一档，或下拉直接跳到任意阶段。
          </p>
        </div>
        <Link href="/crm/leads/new"
              className="rounded-full bg-emerald-600 text-white px-4 h-9 inline-flex items-center text-sm">
          + 新建 Lead
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const items = byCol[col.v];
          return (
            <div key={col.v} className={`rounded-2xl ${col.tone} p-3 min-h-[440px]`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-sm font-medium">{col.label}</div>
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
    { id: "d1", name: "周晓雯",     status: "NEGOTIATING", targetDegree: "大学院", sourceChannel: "小红书", nextAction: "本周三试听后跟进", nextActionDueAt: add(3),  conversionProbability: 70 },
    { id: "d2", name: "刘星辰",     status: "TRIAL",       targetDegree: "学部",   sourceChannel: "公众号", nextAction: "确认试听课时间", nextActionDueAt: add(1),  conversionProbability: 55 },
    { id: "d3", name: "高奈奈",     status: "CONTACTED",   targetDegree: "美术",   sourceChannel: "B站",    nextAction: "约一次面咨",     nextActionDueAt: add(5),  conversionProbability: 30 },
    { id: "d4", name: "Tanaka Yui", status: "NEW",         targetDegree: "大学院", sourceChannel: "推荐",   nextAction: "首次电话沟通",   nextActionDueAt: add(2),  conversionProbability: 15 },
    { id: "d5", name: "陈思琪",     status: "NEW",         targetDegree: "文理科", sourceChannel: "小红书", nextAction: "添加微信",       nextActionDueAt: add(0),  conversionProbability: 10 },
    { id: "d6", name: "王宇翔",     status: "WON",         targetDegree: "大学院", sourceChannel: "推荐",   nextAction: null,             nextActionDueAt: null,    conversionProbability: 100 },
    { id: "d7", name: "Sato Aoi",   status: "NEGOTIATING", targetDegree: "学部",   sourceChannel: "搜索",   nextAction: "出合同",         nextActionDueAt: add(4),  conversionProbability: 80 },
  ];
}
