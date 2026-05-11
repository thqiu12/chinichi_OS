import { prisma } from "@/lib/db";
import { emit } from "./timeline";
import { sendWeCom } from "./wecom";

export async function riskTick() {
  const now = Date.now();
  const d7  = new Date(now - 7  * 86400000);
  const d14 = new Date(now - 14 * 86400000);

  // GREEN → YELLOW (7d 未跟进)
  const yellows = await prisma.student.findMany({
    where: { lastFollowUpAt: { lt: d7, gte: d14 }, riskLevel: "GREEN" },
  });
  for (const s of yellows) {
    await prisma.student.update({ where: { id: s.id }, data: { riskLevel: "YELLOW" } });
    await emit(prisma, {
      studentId: s.id, kind: "RISK_CHANGE",
      title: "风险升级到 YELLOW", body: "已超过 7 天未跟进",
    });
  }

  // → RED (14d)
  const reds = await prisma.student.findMany({
    where: { lastFollowUpAt: { lt: d14 }, riskLevel: { not: "RED" } },
    include: { mentor: true },
  });
  for (const s of reds) {
    await prisma.student.update({ where: { id: s.id }, data: { riskLevel: "RED" } });
    await emit(prisma, {
      studentId: s.id, kind: "RISK_CHANGE",
      title: "风险升级到 RED", body: "已超过 14 天未跟进",
    });
    if (s.mentor?.wecomUserId) {
      await sendWeCom(
        s.mentor.wecomUserId,
        `⚠️ ${s.name} 已 14 天未跟进，请尽快推进。`,
        { studentId: s.id, userId: s.mentorId ?? undefined, title: "高风险学生" },
      );
    }
  }

  return { yellows: yellows.length, reds: reds.length };
}
