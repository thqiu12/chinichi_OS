import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { aiSummarizeFollowUp } from "@/services/ai";
import { emit } from "@/services/timeline";

const Body = z.object({
  studentId: z.string(),
  content: z.string().min(5),
  tags: z.array(z.string()).default([]),
  nextAction: z.string().min(2),
  nextActionDueAt: z.coerce.date(),
  riskLevel: z.enum(["GREEN", "YELLOW", "RED"]).default("GREEN"),
});

export async function POST(req: Request) {
  const me = await currentUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const data = parsed.data;
  const summary = await aiSummarizeFollowUp(data.content);

  try {
    const fu = await prisma.$transaction(async (tx) => {
      const fu = await tx.followUp.create({
        data: {
          studentId: data.studentId,
          mentorId: me.id,
          content: data.content,
          tags: data.tags,
          nextAction: data.nextAction,
          nextActionDueAt: data.nextActionDueAt,
          riskLevel: data.riskLevel,
          aiSummary: summary,
        },
      });

      await tx.student.update({
        where: { id: data.studentId },
        data: {
          lastFollowUpAt: new Date(),
          nextAction: data.nextAction,
          nextActionDueAt: data.nextActionDueAt,
          riskLevel: data.riskLevel,
        },
      });

      await emit(tx, {
        studentId: data.studentId,
        kind: "FOLLOWUP",
        title: `${me.name} 跟进了一次`,
        body: summary,
        actorId: me.id,
        meta: { tags: data.tags, riskLevel: data.riskLevel },
      });
      return fu;
    });
    return NextResponse.json(fu);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
