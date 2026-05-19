import Link from "next/link";
import { DedupeGate } from "@/components/crm/DedupeGate";
import { LeadForm } from "@/components/crm/LeadForm";
import { getChannelTree, getMajorTree, getSchoolTiers } from "@/services/dictApi";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: { step?: string; wechat?: string; phone?: string; name?: string; forced?: string };
}) {
  const showForm = searchParams.step === "form";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-2">新建资源</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        {showForm
          ? "已通过查重，填完后会进入资源详情页。"
          : "先查重——避免重复建资源。微信号是最准的查重凭据。"}
      </p>

      {showForm ? <FormStep
        wechat={searchParams.wechat ?? ""}
        phone={searchParams.phone ?? ""}
        name={searchParams.name ?? ""}
        forced={searchParams.forced === "1"}
      /> : <DedupeGate />}
    </div>
  );
}

async function FormStep({
  wechat, phone, name, forced,
}: { wechat: string; phone: string; name: string; forced: boolean }) {
  const [channelTree, majorTree, schoolTiers, me] = await Promise.all([
    getChannelTree(),
    getMajorTree(),
    getSchoolTiers(),
    currentUser(),
  ]);
  return (
    <LeadForm
      mode="create"
      initial={{ name, wechatId: wechat, phone }}
      channelTree={channelTree}
      majorTree={majorTree}
      schoolTiers={schoolTiers}
      forced={forced}
      canEditChannelLocation={["CHANNEL","ADMIN","HEAD"].includes(me.role)}
    />
  );
}
