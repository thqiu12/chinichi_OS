import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { LeadAttributePill } from "@/components/crm/LeadHeader";
import { AdvisorFollowUpForm } from "@/components/crm/AdvisorFollowUpForm";
import { FrontendFollowUpForm } from "@/components/crm/FrontendFollowUpForm";
import { UnifiedTimeline, type TimelineItem } from "@/components/crm/UnifiedTimeline";
import { ChannelsPanel } from "@/components/crm/ChannelsPanel";
import { conversionStageLabel } from "@/lib/dict";
import { fmtDate, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await currentUser();
  const lead = await safe(
    () =>
      prisma.lead.findUnique({
        where: { id: params.id },
        include: {
          primaryChannel: { include: { parent: { include: { parent: true } } } },
          advisorFollowUps: { include: { author: true }, orderBy: { createdAt: "desc" } },
          frontendFollowUps: { include: { author: true }, orderBy: { createdAt: "desc" } },
          activities: { orderBy: { createdAt: "desc" }, take: 50 },
          contracts: { orderBy: { createdAt: "desc" } },
        },
      }),
    null,
  );

  if (!lead) return demoNotice(params.id);

  // Resolve secondary channel objects
  const secondaryChannels = lead.secondaryChannelIds.length
    ? await safe(
        () =>
          prisma.channel.findMany({
            where: { id: { in: lead.secondaryChannelIds } },
            include: { parent: { include: { parent: true } } },
          }),
        [],
      )
    : [];

  // Resolve referenced user names for frontend followup added/removed
  const allOwnerIds = new Set<string>();
  for (const f of lead.frontendFollowUps) {
    f.addedOwnerIds.forEach((id) => allOwnerIds.add(id));
    f.removedOwnerIds.forEach((id) => allOwnerIds.add(id));
  }
  lead.ownerIds.forEach((id) => allOwnerIds.add(id));
  const userById = new Map<string, { id: string; name: string; role: string }>();
  if (allOwnerIds.size > 0) {
    const users = await safe(
      () =>
        prisma.user.findMany({
          where: { id: { in: [...allOwnerIds] } },
          select: { id: true, name: true, role: true },
        }),
      [],
    );
    for (const u of users) userById.set(u.id, u);
  }

  // Teammates for the FrontendFollowUp owner picker
  const teammates = await safe(
    () =>
      prisma.user.findMany({
        where: { role: { in: ["SALES","CHANNEL","MARKETING","MENTOR","TEACHER","HEAD","ADMIN"] } },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
    [],
  );

  // Merge into TimelineItem[]
  const items: TimelineItem[] = [
    ...lead.advisorFollowUps.map((a) => ({
      kind: "ADVISOR" as const,
      id: a.id,
      authorName: a.author?.name ?? null,
      createdAt: a.createdAt,
      advisorConfirmation: a.advisorConfirmation,
      conversionStage: a.conversionStage,
      detail: a.detail,
      visitedOffice: a.visitedOffice,
      attendedTrial: a.attendedTrial,
      expiredReason: a.expiredReason,
      lostReason: a.lostReason,
      reminderDays: a.reminderDays,
    })),
    ...lead.frontendFollowUps.map((f) => ({
      kind: "FRONTEND" as const,
      id: f.id,
      authorName: f.author?.name ?? null,
      createdAt: f.createdAt,
      communicationRef: f.communicationRef,
      revisitNote: f.revisitNote,
      revisitDetail: f.revisitDetail,
      assignedCampus: f.assignedCampus,
      addedOwnerNames: f.addedOwnerIds.map((id) => userById.get(id)?.name ?? "—"),
      removedOwnerNames: f.removedOwnerIds.map((id) => userById.get(id)?.name ?? "—"),
      invalidReason: f.invalidReason,
    })),
    ...lead.activities.map((a) => ({
      kind: "ACTIVITY" as const,
      id: a.id,
      createdAt: a.createdAt,
      actKind: a.kind,
      content: a.content,
      result: a.result,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Permission: who can write which follow-up
  const canAdvisor  = ["SALES","ADMIN","HEAD"].includes(me.role);
  const canFrontend = ["CHANNEL","MARKETING","ADMIN","HEAD"].includes(me.role);

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
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/crm/leads/${lead.id}/edit`}
                className="rounded-full border border-slate-200 hover:bg-slate-50 px-3 h-9 inline-flex items-center text-sm">
            编辑
          </Link>
          {lead.resourceAttribute === "VALID" && lead.conversionStage !== "已签约" && (
            <Link href={`/crm/leads/${lead.id}/convert`}
                  className="rounded-full bg-emerald-600 text-white px-4 h-9 inline-flex items-center text-sm">
              一键转 Student →
            </Link>
          )}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        {/* LEFT — follow-up forms + unified timeline */}
        <section className="space-y-4">
          {canAdvisor && <AdvisorFollowUpForm leadId={lead.id} />}
          {canFrontend && (
            <FrontendFollowUpForm
              leadId={lead.id}
              teammates={teammates}
              currentOwnerIds={lead.ownerIds}
            />
          )}
          {!canAdvisor && !canFrontend && (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-500">
              当前角色 {me.role} 没有跟进编辑权限。可以查看下方时间轴。
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>跟进时间轴 · {items.length}</CardTitle></CardHeader>
            <CardContent>
              <UnifiedTimeline items={items} />
            </CardContent>
          </Card>
        </section>

        {/* RIGHT — channels + contracts + side info */}
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle>资源来源</CardTitle></CardHeader>
            <CardContent>
              <ChannelsPanel
                leadId={lead.id}
                primary={lead.primaryChannel ? {
                  id: lead.primaryChannel.id,
                  name: lead.primaryChannel.name,
                  parentName: lead.primaryChannel.parent?.name ?? null,
                } : null}
                secondary={secondaryChannels.map((c) => ({
                  id: c.id, name: c.name, parentName: c.parent?.name ?? null,
                }))}
              />
              <div className="text-[11px] text-slate-400 mt-2">
                来源详情：{lead.sourceDetail ?? "—"}<br/>
                所属校区：{lead.sourceCampus ?? "—"}
              </div>
            </CardContent>
          </Card>

          {lead.contracts.length > 0 && (
            <Card>
              <CardHeader><CardTitle>签约</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {lead.contracts.map((c) => (
                  <div key={c.id} className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs">
                    <div className="font-medium text-emerald-800">
                      {c.isRenewal ? "老生续费" : "签约"} {c.amount ? `· ¥${c.amount}` : ""}
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      签约时间：{c.signedAt ? fmtDate(c.signedAt) : "—"}<br/>
                      转接语校：{c.toLanguageSchool ? `是 (${c.languageSchool ?? "未指定"})` : "否"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>当前负责人</CardTitle></CardHeader>
            <CardContent>
              {lead.ownerIds.length === 0 ? (
                <div className="text-sm text-slate-400">未分配</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {lead.ownerIds.map((id) => {
                    const u = userById.get(id);
                    return (
                      <span key={id} className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {u?.name ?? id} · {u?.role ?? ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>元信息</CardTitle></CardHeader>
            <CardContent className="text-[11px] text-slate-500 space-y-1">
              <div>创建于 {fmtDateTime(lead.createdAt)}</div>
              <div>更新于 {fmtDateTime(lead.updatedAt)}</div>
              {lead.lastAdvisorFollowUpAt && <div>最近顾问跟进 {fmtDateTime(lead.lastAdvisorFollowUpAt)}</div>}
              {lead.lastFrontendFollowUpAt && <div>最近前端跟进 {fmtDateTime(lead.lastFrontendFollowUpAt)}</div>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function demoNotice(id: string) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>
      <h1 className="text-xl font-semibold mt-3">资源详情（演示）</h1>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        当前未连接数据库或资源 ID <code className="bg-slate-100 px-1 rounded text-xs">{id}</code> 不存在。
      </p>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        连接 Postgres + <code className="bg-slate-100 px-1 rounded text-xs">npm run db:seed</code> 后会看到：
      </p>
      <ul className="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-1">
        <li>左：根据角色显示咨询顾问跟进 / 前端分配跟进 表单 + 统一时间轴</li>
        <li>右：资源来源（首选+其他+设为首选按钮）/ 签约信息 / 当前负责人 / 元信息</li>
        <li>顶部：资源属性 pill + 转化阶段 badge + 编辑 + 一键转 Student</li>
      </ul>
    </div>
  );
}
