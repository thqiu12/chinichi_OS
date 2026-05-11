import { prisma, safe } from "@/lib/db";
import { FollowUpForm } from "@/components/forms/FollowUpForm";

export const dynamic = "force-dynamic";

export default async function NewFollowUpPage({
  searchParams,
}: {
  searchParams: { studentId?: string };
}) {
  const students = await safe(
    () => prisma.student.findMany({
      orderBy: [{ riskLevel: "desc" }, { lastFollowUpAt: "asc" }],
      select: { id: true, name: true },
    }),
    [{ id: "demo", name: "示例学生" }],
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">写一次跟进</h1>
        <p className="text-sm text-slate-500 mt-1">
          铁律：每次跟进必须有 <b>nextAction</b> + 截止日 —— 系统才能继续推。
        </p>
      </header>
      <FollowUpForm studentId={searchParams.studentId} students={students} />
    </div>
  );
}
