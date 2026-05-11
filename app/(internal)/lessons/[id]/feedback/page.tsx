import { notFound } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { FeedbackQuickForm } from "@/components/forms/FeedbackQuickForm";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LessonFeedbackPage({
  params,
}: {
  params: { id: string };
}) {
  const lesson = await safe(
    () =>
      prisma.lesson.findUnique({
        where: { id: params.id },
        include: { students: { include: { student: true } }, teacher: true },
      }),
    null,
  );
  if (!lesson) return notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">课后反馈</h1>
        <p className="text-sm text-slate-500 mt-1">
          {lesson.subject} · {lesson.teacher.name} · {fmtDateTime(lesson.startsAt)}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          只点 3 个东西，AI 自动扩写成完整反馈，并把"下一步"自动转成学生 TODO。
        </p>
      </header>

      <FeedbackQuickForm
        lessonId={lesson.id}
        students={lesson.students.map((s) => ({ id: s.studentId, name: s.student.name }))}
      />
    </div>
  );
}
