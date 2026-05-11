import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { ConvertWizard } from "@/components/crm/ConvertWizard";

export const dynamic = "force-dynamic";

export default async function ConvertPage({
  params,
}: {
  params: { id: string };
}) {
  const [lead, divisions, mentors] = await Promise.all([
    safe(() => prisma.lead.findUnique({ where: { id: params.id } }), null),
    safe(
      () => prisma.division.findMany({ where: { isShared: false }, orderBy: { name: "asc" } }),
      [
        { id: "demo-grad", name: "大学院", kind: "GRADUATE" },
        { id: "demo-art",  name: "美术",   kind: "ART" },
        { id: "demo-gak",  name: "学部",   kind: "GAKUBU" },
        { id: "demo-lib",  name: "文理科", kind: "LIBERAL" },
        { id: "demo-mus",  name: "音乐",   kind: "MUSIC" },
      ] as any[],
    ),
    safe(
      () => prisma.user.findMany({ where: { role: "MENTOR" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      [{ id: "demo-mentor", name: "佐藤先生" }],
    ),
  ]);

  if (!lead) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>
        <h1 className="text-xl font-semibold mt-3">Lead 不存在</h1>
        <p className="text-sm text-slate-500 mt-2">连数据库 + seed 后可使用此页面。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href={`/crm/leads/${lead.id}`} className="text-sm text-slate-500">← 返回 Lead</Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-2">转 Student</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">{lead.name} · {lead.targetDegree ?? "—"} · {lead.sourceChannel ?? "—"}</p>

      <ConvertWizard
        leadId={lead.id}
        leadName={lead.name}
        defaultTarget={lead.targetDegree}
        divisions={divisions}
        mentors={mentors}
      />
    </div>
  );
}
