import type { DeadlineKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emit } from "./timeline";
import { sendWeCom } from "./wecom";

type Tpl = { kind: DeadlineKind; title: string; offsetDays: number };

export const DEADLINE_TEMPLATES: Record<string, Tpl[]> = {
  GRADUATE: [
    { kind: "EXAM_REGISTRATION", title: "JLPT N1 报名",     offsetDays: 30 },
    { kind: "EXAM_DATE",         title: "JLPT N1 考试",     offsetDays: 90 },
    { kind: "ESSAY_DUE",         title: "研究计划书 v1",    offsetDays: 45 },
    { kind: "APPLICATION_SUBMIT",title: "出愿提交",          offsetDays: 180 },
  ],
  ART: [
    { kind: "ESSAY_DUE",         title: "作品集 v1",         offsetDays: 30 },
    { kind: "INTERVIEW",         title: "Demo 面试",         offsetDays: 60 },
    { kind: "APPLICATION_SUBMIT",title: "艺术校出愿",        offsetDays: 150 },
  ],
  GAKUBU: [
    { kind: "EXAM_REGISTRATION", title: "EJU 报名",          offsetDays: 30 },
    { kind: "EXAM_DATE",         title: "EJU 考试",          offsetDays: 90 },
    { kind: "ESSAY_DUE",         title: "小论文范文",        offsetDays: 60 },
    { kind: "APPLICATION_SUBMIT",title: "学部出愿",          offsetDays: 180 },
  ],
  MUSIC: [
    { kind: "INTERVIEW",         title: "演奏 Demo 录制",    offsetDays: 30 },
    { kind: "APPLICATION_SUBMIT",title: "音乐校出愿",        offsetDays: 150 },
  ],
  LIBERAL: [
    { kind: "EXAM_REGISTRATION", title: "JLPT N2 报名",      offsetDays: 30 },
    { kind: "ESSAY_DUE",         title: "学部志望理由书",    offsetDays: 60 },
  ],
};

export async function applyDeadlineTemplate(
  tx: Prisma.TransactionClient | typeof prisma,
  studentId: string,
  divisionKind: string,
) {
  const tpls = DEADLINE_TEMPLATES[divisionKind] ?? [];
  if (!tpls.length) return;
  const now = Date.now();
  await tx.deadline.createMany({
    data: tpls.map((t) => ({
      studentId,
      kind: t.kind,
      title: t.title,
      dueAt: new Date(now + t.offsetDays * 86400000),
    })),
  });
}

const STAGES = [
  { flag: "remindedT30", days: 30 },
  { flag: "remindedT14", days: 14 },
  { flag: "remindedT7",  days: 7  },
  { flag: "remindedT3",  days: 3  },
  { flag: "remindedT1",  days: 1  },
] as const;

export async function deadlineTick() {
  const now = new Date();
  const dls = await prisma.deadline.findMany({
    where: { completedAt: null },
    include: {
      student: { include: { mentor: true, studentAccount: true } },
    },
  });

  let fired = 0;
  for (const dl of dls) {
    const daysLeft = Math.ceil((dl.dueAt.getTime() - now.getTime()) / 86400000);

    if (daysLeft < 0 && !dl.remindedOver) {
      const msg = `「${dl.title}」已逾期 ${Math.abs(daysLeft)} 天，请尽快确认状态。`;
      await sendWeCom(dl.student.mentor?.wecomUserId, msg, {
        studentId: dl.studentId, userId: dl.student.mentorId ?? undefined,
        title: `逾期 · ${dl.student.name}`,
      });
      await emit(prisma, {
        studentId: dl.studentId, kind: "DEADLINE",
        title: `${dl.title} · 已逾期`, body: msg,
      });
      await prisma.deadline.update({ where: { id: dl.id }, data: { remindedOver: true } });
      fired++;
      continue;
    }

    for (const s of STAGES) {
      if (daysLeft <= s.days && !(dl as any)[s.flag]) {
        const mentorName = dl.student.mentor?.name ?? "你的班主任";
        const studentMsg = `${mentorName}提醒你：本周需要完成「${dl.title}」，还剩 ${daysLeft} 天。`;
        await sendWeCom(dl.student.studentAccount?.wecomId, studentMsg, {
          studentId: dl.studentId,
          title: `Deadline · ${dl.title}`,
        });
        await emit(prisma, {
          studentId: dl.studentId, kind: "DEADLINE",
          title: `${dl.title} · 还剩 ${daysLeft} 天`, body: studentMsg,
        });
        await prisma.deadline.update({
          where: { id: dl.id }, data: { [s.flag]: true } as any,
        });
        fired++;
        break;
      }
    }
  }
  return { fired, scanned: dls.length };
}
