import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { findDuplicates } from "@/services/dedupe";

const Body = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  phoneAux1: z.string().optional(),
  phoneAux2: z.string().optional(),
  wechatId: z.string().optional(),
  wechatAux1: z.string().optional(),
  wechatAux2: z.string().optional(),

  resourceAttribute: z.enum(["PENDING","VALID","INVALID","EXPIRED"]).default("PENDING"),
  invalidReason: z.string().optional(),

  primaryChannelId: z.string().optional(),
  channelLocation:  z.string().optional(),
  sourceDetail:     z.string().optional(),
  sourceCampus:     z.string().optional(),
  customChannelName: z.string().optional(),

  degreeType:   z.string().optional(),
  subjectArea:  z.string().optional(),
  targetMajorId: z.string().optional(),
  specificDirection: z.string().optional(),
  currentSchool: z.string().optional(),
  currentMajor:  z.string().optional(),
  isMajorAligned: z.boolean().optional(),
  schoolTierId: z.string().optional(),
  grade:        z.string().optional(),
  graduationYear: z.coerce.number().optional(),
  province: z.string().optional(),
  city:     z.string().optional(),
  identityKind: z.enum(["STUDENT","PARENT","KIN"]).optional(),
  jlpt: z.enum(["N1","N2","N3_N4","N5_OR_BELOW","STUDYING","UNKNOWN"]).optional(),
  englishLevel: z.string().optional(),
  japanStatus:  z.string().optional(),
  langSchoolStatus: z.enum(["NOT_APPLIED","NO_NEED","ENROLLED","APPLIED_WAITING","UNKNOWN"]).optional(),
  langSchoolEnrollMonth: z.string().optional(),

  conversionProbability: z.coerce.number().min(0).max(100).default(10),
  nextAction: z.string().optional(),
  nextActionDueAt: z.coerce.date().optional(),
  notes: z.string().optional(),

  force: z.boolean().default(false),
});

export async function POST(req: Request) {
  const me = await currentUser();
  if (!["ADMIN","SALES","CHANNEL","MARKETING","HEAD"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const { force, ...data } = parsed.data;

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
      data: {
        ...data,
        salesId: me.id === "demo" ? null : me.id,
        ownerIds: me.id === "demo" ? [] : [me.id],
        createdById: me.id === "demo" ? null : me.id,
      },
    });
    return NextResponse.json(lead);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
