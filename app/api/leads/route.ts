import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { findDuplicates } from "@/services/dedupe";

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
  force: z.boolean().default(false),  // skip dedupe guard when true
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
  const { force, ...data } = parsed.data;

  // Strong dedupe guard: refuse exact phone OR wechat match unless force=true.
  if (!force) {
    const matches = await findDuplicates({
      phone: data.phone, wechatId: data.wechatId, name: data.name,
    });
    const strong = matches.filter((m) => m.matchedOn.some((r) => r === "PHONE" || r === "WECHAT"));
    if (strong.length > 0) {
      return NextResponse.json(
        { error: "DUPLICATE", matches: strong },
        { status: 409 },
      );
    }
  }

  try {
    const lead = await prisma.lead.create({
      data: { ...data, salesId: me.id === "demo" ? null : me.id },
    });
    return NextResponse.json(lead);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
