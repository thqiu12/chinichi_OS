import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const Body = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  wechatId: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  targetDegree: z.string().nullable().optional(),
  sourceChannel: z.string().nullable().optional(),
  status: z.enum(["NEW","CONTACTED","TRIAL","NEGOTIATING","WON","LOST"]).optional(),
  conversionProbability: z.coerce.number().min(0).max(100).optional(),
  nextAction: z.string().nullable().optional(),
  nextActionDueAt: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!["ADMIN","SALES"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  try {
    const before = await prisma.lead.findUnique({ where: { id: params.id } });
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: parsed.data,
    });

    // Auto-log activity when status changes
    if (before && parsed.data.status && before.status !== parsed.data.status) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          authorId: me.id === "demo" ? null : me.id,
          kind: "STATUS_CHANGE",
          content: `${before.status} → ${parsed.data.status}`,
        },
      });
    }
    return NextResponse.json(lead);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
