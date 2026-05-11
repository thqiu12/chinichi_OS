import type { Prisma, TimelineKind } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient | typeof prisma;

export type EmitInput = {
  studentId: string;
  kind: TimelineKind;
  title: string;
  body?: string;
  actorId?: string;
  meta?: Prisma.JsonValue;
  occurredAt?: Date;
};

/**
 * The ONE entry point for writing to the student timeline.
 * Every domain action (lesson, followup, todo, deadline, milestone, risk, echo)
 * must call this — never write to TimelineEvent directly from routes.
 */
export async function emit(tx: Tx, evt: EmitInput) {
  return tx.timelineEvent.create({
    data: {
      studentId: evt.studentId,
      kind: evt.kind,
      title: evt.title,
      body: evt.body,
      actorId: evt.actorId,
      meta: evt.meta as any,
      occurredAt: evt.occurredAt ?? new Date(),
    },
  });
}

export async function getStudentFeed(studentId: string, limit = 50) {
  return prisma.timelineEvent.findMany({
    where: { studentId },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
}
