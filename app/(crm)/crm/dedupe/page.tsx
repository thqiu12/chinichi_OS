import Link from "next/link";
import { findClusters, type Cluster } from "@/services/dedupe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  PHONE: "电话相同", WECHAT: "微信相同", NAME: "姓名相同",
};
const REASON_CLS: Record<string, string> = {
  PHONE:  "bg-rose-100 text-rose-700",
  WECHAT: "bg-rose-100 text-rose-700",
  NAME:   "bg-amber-100 text-amber-700",
};

export default async function DedupePage() {
  const clusters = await findClusters();
  const strong = clusters.filter((c) => c.reason !== "NAME");
  const weak   = clusters.filter((c) => c.reason === "NAME");
  const totalDupLeads = clusters.reduce((s, c) => s + c.leads.length, 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">查重 / 客户清理</h1>
        <p className="text-sm text-slate-500 mt-1">
          {clusters.length === 0
            ? "✓ 没有发现重复客户。"
            : `检测到 ${strong.length} 个强重复 · ${weak.length} 个弱可疑（共 ${totalDupLeads} 条 lead）`}
        </p>
      </header>

      {clusters.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 py-16 text-center text-sm text-slate-400">
          所有客户都是唯一的 🎉<br/>
          <span className="text-[11px] text-slate-300">
            （未连接数据库时为空。连接 Postgres + seed 后此处自动扫描。）
          </span>
        </div>
      ) : (
        <>
          {strong.length > 0 && (
            <Section title="强重复（电话 / 微信完全相同）" tone="rose">
              {strong.map((c) => <ClusterCard key={cKey(c)} cluster={c} />)}
            </Section>
          )}
          {weak.length > 0 && (
            <Section title="弱可疑（仅姓名相同）" tone="amber">
              {weak.map((c) => <ClusterCard key={cKey(c)} cluster={c} />)}
            </Section>
          )}

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 leading-relaxed">
            处理方式（MVP）：打开每个客户对比沟通记录 → 把要保留的留下、把重复的状态改为 <b>流失</b>（在 lead 详情页点状态 pill）。
            未来会上线"合并"按钮：自动把沟通记录搬到主客户名下。
          </div>
        </>
      )}
    </div>
  );
}

function cKey(c: Cluster) {
  return c.reason + "::" + c.key;
}

function Section({
  title, tone, children,
}: {
  title: string; tone: "rose" | "amber"; children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className={`text-sm font-medium mb-2 ${tone === "rose" ? "text-rose-700" : "text-amber-700"}`}>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  const r = REASON_LABEL[cluster.reason];
  const rcls = REASON_CLS[cluster.reason];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className={`mr-2 text-[10px] px-1.5 py-0.5 rounded ${rcls}`}>{r}</span>
          <span className="font-mono text-xs text-slate-500">{cluster.key}</span>
        </CardTitle>
        <span className="text-xs text-slate-500">{cluster.leads.length} 条</span>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-slate-100">
          {cluster.leads.map((l) => (
            <li key={l.id}>
              <Link href={`/crm/leads/${l.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {l.name}
                    <span className="ml-2 text-[11px] text-slate-500">{l.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {l.phone ?? "—"} · {l.wechatId ?? "—"} · 概率 {l.conversionProbability}%
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  创建 {fmtDate(l.createdAt)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
