import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emit } from "@/services/timeline";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const todo = await prisma.todo.update({
      where: { id: params.id },
      data: { status: "DONE", completedAt: new Date() },
    });
    if (todo.studentId) {
      await emit(prisma, {
        studentId: todo.studentId,
        kind: "TODO",
        title: `完成任务 · ${todo.title}`,
      });
    }
  } catch {}
  return NextResponse.redirect(new URL("/student/tasks", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
