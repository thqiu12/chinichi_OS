import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { ConvertWizard } from "@/components/crm/ConvertWizard";
import { suggestAssignment } from "@/services/handoff";

export const dynamic = "force-dynamic";

export default async function ConvertPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { fromSign?: string };
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

  // If already converted, jump straight to the student detail (idempotent UX).
  if (lead.convertedStudentId) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href={`/crm/leads/${lead.id}`} className="text-sm text-slate-500">← 返回 Lead</Link>
        <div className="mt-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
          <div className="text-lg font-semibold text-emerald-900">已开启过学生页面</div>
          <p className="text-sm text-emerald-800 mt-1">
            {lead.name} 之前已经转为学生。点下面进班主任视图。
          </p>
          <Link href={`/students/${lead.convertedStudentId}`}
                className="mt-4 inline-flex rounded-full bg-slate-900 text-white px-4 h-10 items-center text-sm">
            班主任视图 →
          </Link>
        </div>
      </div>
    );
  }

  const suggestion = await suggestAssignment(lead);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href={`/crm/leads/${lead.id}`} className="text-sm text-slate-500">← 返回 Lead</Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-2">签约 · 数据交接 · 开启学生页面</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        {lead.name} · {lead.degreeType ?? "—"} · {lead.subjectArea ?? "—"}
      </p>

      <ConvertWizard
        leadId={lead.id}
        leadName={lead.name}
        defaultTarget={lead.degreeType}
        divisions={divisions}
        mentors={mentors}
        suggestedDivisionId={suggestion.division?.id}
        suggestedMentorId={suggestion.mentor?.id}
        fromSign={searchParams.fromSign === "1"}
        snapshot={{
          name: lead.name,
          phone: lead.phone,
          wechatId: lead.wechatId,
          degreeType: lead.degreeType,
          subjectArea: lead.subjectArea,
          jlpt: lead.jlpt as any,
          englishLevel: lead.englishLevel,
          city: lead.city,
          province: lead.province,
          currentSchool: lead.currentSchool,
        }}
      />
    </div>
  );
}
