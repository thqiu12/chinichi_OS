import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { aiGenerateFeedback } from "@/services/ai";
import { emit } from "@/services/timeline";

const Body = z.object({
  studentId: z.string(),
  tone: z.enum(["GREAT", "OKAY", "RISK"]),
  problems:  z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const data = parsed.data;

  try {
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: params.id } });
    const student = await prisma.student.findUniqueOrThrow({ where: { id: data.studentId } });

    const { aiBody, aiPraise } = await aiGenerateFeedback({
      studentName: student.name,
      subject: lesson.subject,
      tone: data.tone,
      problems: data.problems,
      nextSteps: data.nextSteps,
    });

    const fb = await prisma.$transaction(async (tx) => {
      const fb = await tx.lessonFeedback.create({
        data: {
          lessonId: lesson.id,
          studentId: student.id,
          teacherId: me.id,
          tone: data.tone,
          problems: data.problems,
          nextSteps: data.nextSteps,
          aiBody, aiPraise,
        },
      });

      // Next steps → student todos
      if (data.nextSteps.length) {
        await tx.todo.createMany({
          data: data.nextSteps.map((title) => ({
            ownerType: "STUDENT", studentId: student.id, title,
          })),
        });
      }

      // RISK feedback → bump risk
      if (data.tone === "RISK" && student.riskLevel === "GREEN") {
        await tx.student.update({
          where: { id: student.id },
          data: { riskLevel: "YELLOW" },
        });
        await emit(tx, {
          studentId: student.id, kind: "RISK_CHANGE",
          title: "风险升级到 YELLOW", body: "课堂状态判定为 RISK",
        });
      }

      await emit(tx, {
        studentId: student.id, kind: "LESSON",
        title: `${lesson.subject} 课后反馈`, body: aiBody,
        actorId: me.id,
      });
      return fb;
    });

    return NextResponse.json(fb);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
