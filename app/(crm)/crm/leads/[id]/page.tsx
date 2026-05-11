import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { fmtDate, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NEW: "新", CONTACTED: "已联系", TRIAL: "试听",
  NEGOTIATING: "意向", WON: "成交", LOST: "流失",
};

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await safe(
    () => prisma.lead.findUnique({ where: { id: params.id } }),
    null,
  );

  if (!lead) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>
        <h1 className="text-xl font-semibold mt-3">Lead 不存在</h1>
        <p className="text-sm text-slate-500 mt-1">
          当前未连接数据库或该 ID 已删除。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {lead.phone ?? "无电话"} · {lead.sourceChannel ?? "无渠道"}
          </p>
        </div>
        <Badge>{STATUS_LABEL[lead.status]}</Badge>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <Field label="目标"    value={lead.targetDegree} />
        <Field label="国籍"    value={lead.nationality} />
        <Field label="微信"    value={lead.wechatId} />
        <Field label="转化概率" value={`${lead.conversionProbability}%`} />
        <Field label="下一步"  value={lead.nextAction} />
        <Field label="截止"    value={lead.nextActionDueAt ? fmtDate(lead.nextActionDueAt) : null} />
      </section>

      <section className="rounded-2xl bg-white border border-slate-100 p-5">
        <div className="text-xs text-slate-500 mb-1">备注</div>
        <div className="text-sm whitespace-pre-wrap">{lead.notes ?? <span className="text-slate-400">—</span>}</div>
        <div className="text-[11px] text-slate-400 mt-3">
          创建于 {fmtDateTime(lead.createdAt)} · 更新于 {fmtDateTime(lead.updatedAt)}
        </div>
      </section>

      {lead.status !== "WON" && lead.status !== "LOST" && (
        <ConvertCTA leadId={lead.id} />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm mt-0.5">{value ?? <span className="text-slate-400">—</span>}</div>
    </div>
  );
}

function ConvertCTA({ leadId }: { leadId: string }) {
  return (
    <section className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
      <div className="text-sm font-medium text-emerald-800">成交后一键转 Student</div>
      <p className="text-xs text-emerald-700/80 mt-1 leading-relaxed">
        系统会自动：建 Student / 套用事业部 Deadline 模板 / 写初始 TODO /
        建学生账号 / Timeline 落 "入学" milestone。
      </p>
      <form action={`/api/leads/${leadId}/convert`} method="post" className="mt-3 text-xs text-slate-500">
        <p>(MVP 暂用 API 调用，UI 表单待补完)</p>
      </form>
    </section>
  );
}
