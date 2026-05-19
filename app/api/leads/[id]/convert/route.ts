// Convert a Lead → Student. The bridge step that opens the student portal.
// On success: Student + StudentAccount + initial Todos + Deadline template applied,
// Lead is marked converted (convertedStudentId set), and the student gets a
// "入学" Timeline milestone.

import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { applyDeadlineTemplate } from "@/services/deadlines";
import { emit } from "@/services/timeline";
import { addDays } from "@/lib/utils";
import { currentUser } from "@/lib/auth";

const Body = z.object({
  divisionId: z.string(),
  mentorId: z.string(),
  targetSchool: z.string().optional(),
  targetMajor: z.string().optional(),
  studentEmail: z.string().email().optional(),
  studentPassword: z.string().min(4).optional(),
});

function autoEmail(lead: { id: string; phone: string | null; wechatId: string | null }) {
  const slug = lead.phone ?? lead.wechatId ?? lead.id;
  return `${String(slug).replace(/[^a-zA-Z0-9_]/g, "")}@student.chinichi.local`;
}

function autoPassword() {
  // Short, easy-to-share temp password. Sales tells student to change it.
  // Format: 8 chars of url-safe base64 of a random buffer.
  const arr = new Uint8Array(6);
  (globalThis.crypto ?? require("crypto").webcrypto).getRandomValues(arr);
  return Buffer.from(arr).toString("base64url");
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!["ADMIN", "SALES", "HEAD"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const data = parsed.data;

  try {
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: params.id } });

    // Idempotent: if this lead is already converted, return the existing student
    // so re-clicks don't create duplicates.
    if (lead.convertedStudentId) {
      const existing = await prisma.student.findUnique({
        where: { id: lead.convertedStudentId },
      });
      return NextResponse.json({ ...existing, alreadyConverted: true });
    }

    const division = await prisma.division.findUniqueOrThrow({ where: { id: data.divisionId } });
    const tempPassword = data.studentPassword ?? autoPassword();
    const email = data.studentEmail ?? autoEmail(lead);

    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          name: lead.name,
          divisionId: data.divisionId,
          mentorId: data.mentorId,
          targetSchool: data.targetSchool ?? lead.currentSchool ?? lead.degreeType ?? undefined,
          targetMajor: data.targetMajor,
          stage: "ONBOARDING",
          nextAction: "完成入学面谈，确认升学目标",
          nextActionDueAt: addDays(new Date(), 3),

          // ── Snapshot from Lead ──
          phone:        lead.phone,
          wechatId:     lead.wechatId,
          degreeType:   lead.degreeType,
          subjectArea:  lead.subjectArea,
          jlpt:         lead.jlpt,
          englishLevel: lead.englishLevel,
          province:     lead.province,
          city:         lead.city,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          // conversionStage stays whatever sales set (当月分配当月签约 / 签约)
          resourceAttribute: "VALID",
          convertedStudentId: student.id,
        },
      });

      await tx.studentAccount.create({
        data: {
          studentId: student.id,
          email,
          password: await bcrypt.hash(tempPassword, 10),
        },
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
        body: `${student.name} 完成签约，加入 ${division.name} 事业部`,
        actorId: me.id === "demo" ? undefined : me.id,
      });

      return student;
    });

    // The temp password is needed by sales to share with the student. We only
    // return it on the create response — it's not persisted in plaintext, so
    // there's no later way to retrieve it (sales must re-issue from the UI).
    return NextResponse.json({
      ...result,
      credentials: {
        email,
        tempPassword,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
