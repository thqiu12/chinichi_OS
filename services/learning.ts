// Learning Integration Layer — pluggable providers (Echo / JLPT App / AI Interview / LMS).
// New providers don't change the schema: they map to LearningSignal and feed `ingest`.

import { prisma } from "@/lib/db";
import { emit } from "./timeline";

export type LearningSignal = {
  date: Date;
  studyMinutes?: number;
  streak?: number;
  metrics?: {
    shadowingDone?: number;
    aiConvCount?: number;
    pronScore?: number;
  };
  raw: any;
};

export interface LearningProvider {
  name: "echo" | "jlpt-app" | "ai-interview" | "lms";
  parse(payload: any, ctx: { studentId: string }): LearningSignal[];
}

export const echoProvider: LearningProvider = {
  name: "echo",
  parse(payload) {
    return [{
      date: new Date(payload.date ?? Date.now()),
      studyMinutes: Number(payload.study_minutes ?? 0),
      streak: Number(payload.streak ?? 0),
      metrics: {
        shadowingDone: Number(payload.shadowing_done ?? 0),
        aiConvCount:   Number(payload.ai_conv_count ?? 0),
        pronScore:     payload.pron_score != null ? Number(payload.pron_score) : undefined,
      },
      raw: payload,
    }];
  },
};

export async function ingestLearning(
  provider: LearningProvider,
  payload: any,
  studentId: string,
) {
  const signals = provider.parse(payload, { studentId });
  for (const s of signals) {
    const date = new Date(Date.UTC(s.date.getUTCFullYear(), s.date.getUTCMonth(), s.date.getUTCDate()));
    await prisma.echoSnapshot.upsert({
      where: { studentId_date: { studentId, date } },
      create: {
        studentId, date,
        studyMinutes:  s.studyMinutes ?? 0,
        streak:        s.streak ?? 0,
        shadowingDone: s.metrics?.shadowingDone ?? 0,
        aiConvCount:   s.metrics?.aiConvCount ?? 0,
        pronScore:     s.metrics?.pronScore,
        raw:           s.raw,
      },
      update: {
        studyMinutes:  s.studyMinutes ?? 0,
        streak:        s.streak ?? 0,
        shadowingDone: s.metrics?.shadowingDone ?? 0,
        aiConvCount:   s.metrics?.aiConvCount ?? 0,
        pronScore:     s.metrics?.pronScore,
        raw:           s.raw,
      },
    });

    await emit(prisma, {
      studentId, kind: "ECHO_LEARNING",
      title: `${provider.name} · 今日学习`,
      body: `${s.studyMinutes ?? 0} 分钟 · streak ${s.streak ?? 0}`,
      meta: s.metrics as any,
    });

    // Bump growthScore by a small amount on activity (capped at 100)
    if ((s.studyMinutes ?? 0) > 0) {
      const inc = Math.min(2, Math.floor((s.studyMinutes ?? 0) / 30) + 1);
      await prisma.student.update({
        where: { id: studentId },
        data: { growthScore: { increment: inc } },
      });
    }
  }
  return { count: signals.length };
}
