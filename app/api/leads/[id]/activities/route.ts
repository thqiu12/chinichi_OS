import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const Body = z.object({
  kind: z.enum(["CALL","MESSAGE","MEETING","TRIAL_LESSON","NOTE"]),
  content: z.string().min(2),
  result: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDueAt: z.coerce.date().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!["ADMIN","SALES"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const { kind, content, result, nextAction, nextActionDueAt } = parsed.data;

  try {
    const [act] = await prisma.$transaction([
      prisma.leadActivity.create({
        data: {
          leadId: params.id,
          authorId: me.id === "demo" ? null : me.id,
          kind, content, result, nextAction, nextActionDueAt,
        },
      }),
      prisma.lead.update({
        where: { id: params.id },
        data: {
          ...(nextAction       ? { nextAction }                 : {}),
          ...(nextActionDueAt  ? { nextActionDueAt }            : {}),
        },
      }),
    ]);
    return NextResponse.json(act);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
