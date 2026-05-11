import Link from "next/link";
import { DedupeGate } from "@/components/crm/DedupeGate";
import { NewLeadForm } from "@/components/crm/NewLeadForm";

export default function NewLeadPage({
  searchParams,
}: {
  searchParams: { step?: string; wechat?: string; phone?: string; name?: string; forced?: string };
}) {
  const showForm = searchParams.step === "form";

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-2">新建客户</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        {showForm
          ? "已通过查重，填完后会进入 Lead 详情页。"
          : "先查重——避免重复建客户。微信号是最准的查重凭据。"}
      </p>

      {showForm ? (
        <NewLeadForm
          initialName={searchParams.name ?? ""}
          initialWechat={searchParams.wechat ?? ""}
          initialPhone={searchParams.phone ?? ""}
          forced={searchParams.forced === "1"}
        />
      ) : (
        <DedupeGate />
      )}
    </div>
  );
}
