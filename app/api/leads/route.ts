import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const Body = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  wechatId: z.string().optional(),
  nationality: z.string().optional(),
  targetDegree: z.string().optional(),
  sourceChannel: z.string().optional(),
  status: z.enum(["NEW","CONTACTED","TRIAL","NEGOTIATING","WON","LOST"]).default("NEW"),
  conversionProbability: z.coerce.number().min(0).max(100).default(10),
  nextAction: z.string().optional(),
  nextActionDueAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const me = await currentUser();
  if (!["ADMIN","SALES"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  try {
    const lead = await prisma.lead.create({
      data: { ...parsed.data, salesId: me.id === "demo" ? null : me.id },
    });
    return NextResponse.json(lead);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
