import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emit } from "@/services/timeline";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const dl = await prisma.deadline.update({
      where: { id: params.id },
      data: { completedAt: new Date() },
    });
    await emit(prisma, {
      studentId: dl.studentId, kind: "DEADLINE",
      title: `${dl.title} · 已完成 ✓`,
    });
    return NextResponse.json(dl);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
