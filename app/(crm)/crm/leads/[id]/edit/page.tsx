import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { LeadForm } from "@/components/crm/LeadForm";
import { getChannelTree, getMajorTree, getSchoolTiers } from "@/services/dictApi";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const [lead, channelTree, majorTree, schoolTiers, me] = await Promise.all([
    safe(() => prisma.lead.findUnique({ where: { id: params.id } }), null),
    getChannelTree(), getMajorTree(), getSchoolTiers(), currentUser(),
  ]);
  if (!lead) return notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href={`/crm/leads/${lead.id}`} className="text-sm text-slate-500">← 返回</Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-2">编辑资源</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">{lead.name}</p>

      <LeadForm
        mode="edit"
        initial={lead as any}
        channelTree={channelTree}
        majorTree={majorTree}
        schoolTiers={schoolTiers}
        canEditChannelLocation={["CHANNEL","ADMIN","HEAD"].includes(me.role)}
      />
    </div>
  );
}
