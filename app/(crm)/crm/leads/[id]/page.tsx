import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { LeadAttributePill, LeadInlineField, LeadProbabilitySlider } from "@/components/crm/LeadHeader";
import { ActivityLogger } from "@/components/crm/ActivityLogger";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { conversionStageLabel } from "@/lib/dict";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const ACT_ICON: Record<string, string> = {
  CALL: "📞", MESSAGE: "💬", MEETING: "🤝",
  TRIAL_LESSON: "🎓", NOTE: "📝", STATUS_CHANGE: "🔁",
};
const ACT_LABEL: Record<string, string> = {
  CALL: "通话", MESSAGE: "消息", MEETING: "面谈",
  TRIAL_LESSON: "试听课", NOTE: "备注", STATUS_CHANGE: "状态变更",
};

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await safe(
    () =>
      prisma.lead.findUnique({
        where: { id: params.id },
        include: {
          activities: { orderBy: { createdAt: "desc" }, take: 50 },
          primaryChannel: true,
        },
      }),
    null,
  );

  if (!lead) return demoNotice(params.id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>

      {/* Header */}
      <header className="mt-3 flex items-start gap-4">
        <Avatar name={lead.name} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <LeadAttributePill leadId={lead.id} initial={lead.resourceAttribute as any} />
            {lead.conversionStage && (() => {
              const s = conversionStageLabel(lead.conversionStage);
              return <Badge className={s.cls}>{s.label}</Badge>;
            })()}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            微信 {lead.wechatId ?? "—"} · 电话 {lead.phone ?? "—"} ·
            {" "}渠道 {lead.primaryChannel?.name ?? "—"} ·
            {" "}升学类型 {lead.degreeType ?? "—"}
          </p>
        </div>
        {lead.resourceAttribute === "VALID" && lead.conversionStage !== "已签约" && (
          <Link href={`/crm/leads/${lead.id}/convert`}
                className="rounded-full bg-emerald-600 text-white px-4 h-9 inline-flex items-center text-sm shrink-0">
            一键转 Student →
          </Link>
        )}
      </header>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        {/* LEFT: activity feed + logger */}
        <section className="space-y-4">
          <ActivityLogger leadId={lead.id} />

          <Card>
            <CardHeader>
              <CardTitle>沟通记录 · {lead.activities.length}</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.activities.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  还没有沟通记录 —— 用上方表单记一笔
                </div>
              ) : (
                <ol className="relative border-l border-slate-100 ml-3 space-y-1">
                  {lead.activities.map((a) => (
                    <li key={a.id} className="pl-5 pb-4 relative">
                      <span className="absolute -left-[10px] top-1 w-[18px] h-[18px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px]">
                        {ACT_ICON[a.kind] ?? "•"}
                      </span>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{ACT_LABEL[a.kind] ?? a.kind}</div>
                        <div className="text-[11px] text-slate-400">{fmtDateTime(a.createdAt)}</div>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 leading-relaxed">{a.content}</p>
                      {(a.result || a.nextAction) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs">
                          {a.result && <span className="text-emerald-700">结果：{a.result}</span>}
                          {a.nextAction && <span className="text-slate-500">下一步：{a.nextAction}{a.nextActionDueAt && ` · ${fmtDate(a.nextActionDueAt)}`}</span>}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </section>

        {/* RIGHT: editable fields */}
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle>客户信息</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Editable label="转化概率">
                <LeadProbabilitySlider leadId={lead.id} initial={lead.conversionProbability} />
              </Editable>
              <Editable label="电话">
                <LeadInlineField leadId={lead.id} field="phone" initial={lead.phone} placeholder="点击填写" />
              </Editable>
              <Editable label="微信">
                <LeadInlineField leadId={lead.id} field="wechatId" initial={lead.wechatId} placeholder="点击填写" />
              </Editable>
              <Editable label="升学类型">
                <LeadInlineField leadId={lead.id} field="degreeType" initial={lead.degreeType} placeholder="点击填写" />
              </Editable>
              <Editable label="学科属性">
                <LeadInlineField leadId={lead.id} field="subjectArea" initial={lead.subjectArea} placeholder="点击填写" />
              </Editable>
              <Editable label="所在城市">
                <LeadInlineField leadId={lead.id} field="city" initial={lead.city} placeholder="点击填写" />
              </Editable>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>下一步</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Editable label="动作">
                <LeadInlineField leadId={lead.id} field="nextAction" initial={lead.nextAction} placeholder="例如：周三面咨" />
              </Editable>
              <Editable label="截止">
                <LeadInlineField leadId={lead.id} field="nextActionDueAt" initial={lead.nextActionDueAt as any}
                                 type="date" placeholder="—" />
              </Editable>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>备注</CardTitle></CardHeader>
            <CardContent>
              <LeadInlineField leadId={lead.id} field="notes" initial={lead.notes} placeholder="点击填写备注…" />
              <div className="text-[11px] text-slate-400 mt-3">
                创建于 {fmtDateTime(lead.createdAt)}<br/>
                更新于 {fmtDateTime(lead.updatedAt)}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Editable({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>
      {children}
    </div>
  );
}

function demoNotice(id: string) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>
      <h1 className="text-xl font-semibold mt-3">Lead 详情（演示）</h1>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        当前未连接数据库，无法加载 Lead <code className="bg-slate-100 px-1 rounded text-xs">{id}</code> 的活动流。
        连接 Postgres + <code className="bg-slate-100 px-1 rounded text-xs">npm run db:seed</code> 后，
        本页会显示：
      </p>
      <ul className="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-1">
        <li>左侧：沟通记录时间流（CALL / MESSAGE / 试听 / 备注 / 状态变更）+ 一键记录</li>
        <li>右侧：转化概率滑块、电话/微信/渠道/目标 inline 编辑、下一步、备注</li>
        <li>顶部：状态 pill 点击切换、"一键转 Student" 入口</li>
      </ul>
    </div>
  );
}
