import Link from "next/link";
import { NewLeadForm } from "@/components/crm/NewLeadForm";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-2">新建 Lead</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        填完后会进入这个 Lead 的详情页，可以继续记沟通、改概率、最后一键转 Student。
      </p>
      <NewLeadForm />
    </div>
  );
}
