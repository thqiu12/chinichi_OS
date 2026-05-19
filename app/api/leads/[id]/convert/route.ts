import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { applyDeadlineTemplate } from "@/services/deadlines";
import { emit } from "@/services/timeline";
import { addDays } from "@/lib/utils";

const Body = z.object({
  divisionId: z.string(),
  mentorId: z.string(),
  targetSchool: z.string().optional(),
  targetMajor: z.string().optional(),
  studentEmail: z.string().email().optional(),
  studentPassword: z.string().min(4).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const data = parsed.data;

  try {
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: params.id } });
    const division = await prisma.division.findUniqueOrThrow({ where: { id: data.divisionId } });

    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          name: lead.name,
          divisionId: data.divisionId,
          mentorId: data.mentorId,
          targetSchool: data.targetSchool ?? lead.degreeType ?? undefined,
          targetMajor: data.targetMajor,
          stage: "ONBOARDING",
          nextAction: "完成入学面谈，确认升学目标",
          nextActionDueAt: addDays(new Date(), 3),
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          conversionStage: "已签约",
          resourceAttribute: "VALID",
          convertedStudentId: student.id,
        },
      });

      const email = data.studentEmail ?? `${lead.phone ?? student.id}@chinichi.local`;
      const password = await bcrypt.hash(data.studentPassword ?? "1234", 10);
      await tx.studentAccount.create({
        data: { studentId: student.id, email, password },
      });

      await applyDeadlineTemplate(tx, student.id, division.kind);

      await tx.todo.createMany({
        data: [
          { ownerType: "STUDENT", studentId: student.id, title: "上传当前日语水平证明" },
          { ownerType: "STUDENT", studentId: student.id, title: "填写升学目标问卷" },
          {
            ownerType: "STAFF",
            assigneeId: data.mentorId,
            studentId: student.id,
            title: `与 ${student.name} 进行入学面谈`,
            dueAt: addDays(new Date(), 3),
          },
        ],
      });

      await emit(tx, {
        studentId: student.id,
        kind: "MILESTONE",
        title: "入学 🎉",
        body: `${student.name} 加入 Chinichi OS，开启升学项目`,
      });

      return student;
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
