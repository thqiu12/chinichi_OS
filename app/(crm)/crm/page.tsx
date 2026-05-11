import Link from "next/link";
import { getCrmHome } from "@/services/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtDate, daysUntil, greet } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NEW: "新", CONTACTED: "已联系", TRIAL: "试听",
  NEGOTIATING: "意向", WON: "成交", LOST: "流失",
};
const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-slate-300", CONTACTED: "bg-blue-400", TRIAL: "bg-amber-400",
  NEGOTIATING: "bg-emerald-500", WON: "bg-emerald-700", LOST: "bg-slate-400",
};

const FUNNEL = ["NEW","CONTACTED","TRIAL","NEGOTIATING","WON"] as const;

export default async function CrmHomePage() {
  const d = await getCrmHome();
  const total = FUNNEL.reduce((s, k) => s + (d.funnel[k] ?? 0), 0) || 1;
  const wonRate = Math.round(((d.funnel.WON ?? 0) / total) * 100);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greet()}，{d.me.name} ☀️
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            今天有 <b>{d.todayFocus.length}</b> 个客户该跟进，
            <b className="text-emerald-700"> 本周新增 {d.newThisWeek}</b> · 成交 {d.wonThisWeek}。
          </p>
        </div>
        <Link href="/crm/leads/new"
              className="rounded-full bg-emerald-600 text-white px-4 h-9 inline-flex items-center text-sm">
          + 新建 Lead
        </Link>
      </header>

      {d.isEmpty && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 px-4 py-3 text-sm">
          当前未连接数据库，下方数字为演示数据。运行 <code className="bg-amber-100 px-1 rounded">npm run db:seed</code> 后会换成真实数据。
        </div>
      )}

      {/* Top row: Today focus + Trials + Funnel */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>今天该跟进</CardTitle>
            <Link href="/crm/leads" className="text-xs text-slate-500 hover:underline">全部 →</Link>
          </CardHeader>
          <CardContent>
            {d.todayFocus.length === 0 ? (
              <Empty>没有当天到期的跟进 👏</Empty>
            ) : (
              <ul className="space-y-2">
                {d.todayFocus.map((l: any) => {
                  const days = l.nextActionDueAt ? daysUntil(l.nextActionDueAt) : 999;
                  const tone = days < 0 ? "text-rose-600" : days === 0 ? "text-amber-700" : "text-slate-500";
                  return (
                    <li key={l.id}>
                      <Link href={`/crm/leads/${l.id}`}
                            className="block rounded-xl border border-slate-100 hover:border-slate-200 p-3 transition">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{l.name}</span>
                          <span className={`text-[11px] ${tone}`}>
                            {days < 0 ? `逾期 ${-days}d` : days === 0 ? "今天" : `${days}d 内`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {l.nextAction ?? "（未设置）"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>试听中</CardTitle>
            <Link href="/crm/trials" className="text-xs text-slate-500 hover:underline">全部 →</Link>
          </CardHeader>
          <CardContent>
            {d.trials.length === 0 ? (
              <Empty>暂无试听客户</Empty>
            ) : (
              <ul className="space-y-2">
                {d.trials.map((l: any) => (
                  <li key={l.id} className="flex justify-between items-center text-sm">
                    <Link href={`/crm/leads/${l.id}`} className="hover:underline">{l.name}</Link>
                    <span className="text-xs text-slate-500">
                      {l.nextActionDueAt ? fmtDate(l.nextActionDueAt) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>近期成交</CardTitle></CardHeader>
          <CardContent>
            {d.recentWon.length === 0 ? (
              <Empty>本月还没有成交</Empty>
            ) : (
              <ul className="space-y-2">
                {d.recentWon.map((l: any) => (
                  <li key={l.id} className="flex justify-between text-sm">
                    <span>{l.name}</span>
                    <span className="text-xs text-slate-500">{fmtDate(l.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Funnel + Sources */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>转化漏斗</CardTitle>
            <span className="text-xs text-slate-500">总转化率 {wonRate}%</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {FUNNEL.map((k) => {
                const v = d.funnel[k] ?? 0;
                const max = Math.max(...FUNNEL.map((x) => d.funnel[x] ?? 0));
                const pct = max > 0 ? Math.round((v / max) * 100) : 0;
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{STATUS_LABEL[k]}</span>
                      <span className="text-slate-500">{v}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${STATUS_COLOR[k]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>渠道来源</CardTitle>
            <span className="text-xs text-slate-500">{d.sources.reduce((s: number, x: any) => s + x.count, 0)} 个 lead</span>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {d.sources.map((s: any) => {
                const max = Math.max(...d.sources.map((x: any) => x.count), 1);
                const pct = Math.round((s.count / max) * 100);
                return (
                  <li key={s.source}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{s.source}</span>
                      <span className="text-slate-500">{s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
              {d.sources.length === 0 && <Empty>暂无数据</Empty>}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-sm text-slate-400">{children}</div>;
}
