import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { emit } from "@/services/timeline";

const Body = z.object({
  status: z.enum(["PENDING", "DOING", "DONE", "OVERDUE"]).optional(),
  title: z.string().optional(),
  dueAt: z.coerce.date().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  try {
    const before = await prisma.todo.findUniqueOrThrow({ where: { id: params.id } });
    const todo = await prisma.todo.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        completedAt: parsed.data.status === "DONE" ? new Date()
                    : parsed.data.status ? null
                    : undefined,
      },
    });

    if (todo.studentId && parsed.data.status && parsed.data.status !== before.status) {
      await emit(prisma, {
        studentId: todo.studentId,
        kind: "TODO",
        title: `TODO · ${todo.title}`,
        body: `状态 ${before.status} → ${todo.status}`,
      });
    }

    return NextResponse.json(todo);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
