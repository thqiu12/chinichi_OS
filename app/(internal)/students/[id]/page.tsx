import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TimelineFeed } from "@/components/cards/TimelineFeed";
import {
  divisionLabel, fmtDate, fmtDateTime, riskLabel, stageLabel, daysUntil,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const TABS = [
  { v: "overview",  label: "概览" },
  { v: "timeline",  label: "Timeline" },
  { v: "todos",     label: "TODO" },
  { v: "deadlines", label: "Deadline" },
  { v: "lessons",   label: "课程" },
  { v: "followups", label: "跟进" },
] as const;

export default async function StudentPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const tab = (TABS.find((t) => t.v === searchParams.tab)?.v) ?? "overview";

  const s = await safe(
    () =>
      prisma.student.findUnique({
        where: { id: params.id },
        include: {
          division: true, mentor: true,
          todos: { orderBy: { createdAt: "desc" }, take: 30 },
          deadlines: { orderBy: { dueAt: "asc" } },
          followUps: { orderBy: { createdAt: "desc" }, include: { mentor: true } },
          feedbacks: { orderBy: { createdAt: "desc" }, include: { teacher: true, lesson: true }, take: 20 },
          lessons: {
            include: { lesson: { include: { teacher: true } } },
            orderBy: { lesson: { startsAt: "desc" } },
            take: 20,
          },
          events: { orderBy: { occurredAt: "desc" }, take: 80 },
        },
      }),
    null,
  );

  if (!s) return notFound();
  const r = riskLabel(s.riskLevel);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <header className="flex items-start gap-4">
        <Avatar name={s.name} size={56} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
            <Badge className={r.cls}><Dot className={r.dot} /> {r.label}</Badge>
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {divisionLabel(s.division.kind)} · {stageLabel(s.stage)}
            {s.targetSchool && <> · 目标 {s.targetSchool}</>}
            {s.mentor && <> · 班主任 {s.mentor.name}</>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Link href={`/followups/new?studentId=${s.id}`}
                  className="rounded-full bg-slate-900 text-white px-4 h-9 inline-flex items-center text-sm">
              + 写跟进
            </Link>
            <span className="text-xs text-slate-400">
              最近跟进 {s.lastFollowUpAt ? fmtDate(s.lastFollowUpAt) : "—"}
            </span>
          </div>
        </div>
        <NextActionBadge action={s.nextAction} due={s.nextActionDueAt} />
      </header>

      <nav className="flex gap-1 border-b border-slate-100">
        {TABS.map((t) => (
          <Link key={t.v} href={`/students/${s.id}?tab=${t.v}`}
                className={`px-3 h-9 inline-flex items-center text-sm rounded-t-lg ${
                  tab === t.v ? "bg-white border border-slate-100 border-b-white -mb-px text-slate-900"
                              : "text-slate-500 hover:text-slate-800"
                }`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>近期 Timeline</CardTitle></CardHeader>
            <CardContent>
              <TimelineFeed events={s.events.slice(0, 12)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>关键 Deadline</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {s.deadlines.filter((d) => !d.completedAt).slice(0, 5).map((d) => {
                const days = daysUntil(d.dueAt);
                return (
                  <div key={d.id} className="flex justify-between text-sm">
                    <span>{d.title}</span>
                    <span className={days <= 3 ? "text-rose-600" : "text-slate-500"}>
                      {fmtDate(d.dueAt)} · {days <= 0 ? "今天" : `${days}d`}
                    </span>
                  </div>
                );
              })}
              {s.deadlines.length === 0 && <Empty>没有 deadline</Empty>}
            </CardContent>
          </Card>
        </section>
      )}

      {tab === "timeline" && (
        <Card><CardContent><TimelineFeed events={s.events} /></CardContent></Card>
      )}

      {tab === "todos" && (
        <Card><CardContent>
          {s.todos.length === 0 ? <Empty>没有 TODO</Empty> : (
            <ul className="divide-y divide-slate-100">
              {s.todos.map((t) => (
                <li key={t.id} className="flex justify-between py-2 text-sm">
                  <span>
                    <span className={`mr-2 inline-block w-1.5 h-1.5 rounded-full ${
                      t.status === "DONE" ? "bg-emerald-500"
                      : t.status === "OVERDUE" ? "bg-rose-500"
                      : "bg-slate-300"
                    }`} />
                    {t.title}
                    <span className="ml-2 text-[11px] text-slate-400">{t.ownerType}</span>
                  </span>
                  {t.dueAt && <span className="text-slate-500">{fmtDate(t.dueAt)}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      )}

      {tab === "deadlines" && (
        <Card><CardContent>
          {s.deadlines.length === 0 ? <Empty>没有 deadline</Empty> : (
            <ul className="divide-y divide-slate-100">
              {s.deadlines.map((d) => {
                const days = daysUntil(d.dueAt);
                return (
                  <li key={d.id} className="flex justify-between py-2 text-sm">
                    <span>{d.title} <span className="text-[11px] text-slate-400">{d.kind}</span></span>
                    <span className={days <= 3 ? "text-rose-600" : "text-slate-500"}>
                      {fmtDate(d.dueAt)} · {d.completedAt ? "已完成" : days <= 0 ? "今天" : `${days}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent></Card>
      )}

      {tab === "lessons" && (
        <Card><CardContent>
          {s.lessons.length === 0 ? <Empty>没有课程记录</Empty> : (
            <ul className="divide-y divide-slate-100">
              {s.lessons.map((ls) => (
                <li key={ls.lesson.id} className="flex justify-between py-2 text-sm">
                  <span>{ls.lesson.subject}
                    <span className="text-[11px] text-slate-400 ml-2">{ls.lesson.teacher.name}</span>
                  </span>
                  <span className="text-slate-500">{fmtDateTime(ls.lesson.startsAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      )}

      {tab === "followups" && (
        <Card><CardContent>
          {s.followUps.length === 0 ? <Empty>还没有跟进</Empty> : (
            <ul className="space-y-3">
              {s.followUps.map((f) => (
                <li key={f.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">
                    {f.mentor.name} · {fmtDateTime(f.createdAt)}
                  </div>
                  <div className="text-sm mt-1">{f.content}</div>
                  {f.aiSummary && (
                    <div className="text-xs text-brand-700 mt-1">AI 摘要：{f.aiSummary}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-2">
                    下一步：{f.nextAction} · 截止 {fmtDate(f.nextActionDueAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      )}
    </div>
  );
}

function NextActionBadge({
  action, due,
}: { action: string | null; due: Date | null }) {
  if (!action) return null;
  const days = due ? daysUntil(due) : 999;
  const cls = days <= 0 ? "bg-rose-50 text-rose-700"
            : days <= 1 ? "bg-amber-50 text-amber-700"
            : "bg-brand-50 text-brand-700";
  return (
    <div className={`max-w-xs rounded-2xl ${cls} p-3 text-sm`}>
      <div className="text-[11px] opacity-80">下一步</div>
      <div className="font-medium mt-0.5">{action}</div>
      {due && <div className="text-[11px] mt-1">{fmtDate(due)} · {days <= 0 ? "今天" : `${days} 天后`}</div>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-slate-400">{children}</div>;
}
