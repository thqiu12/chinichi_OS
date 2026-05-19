import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const Body = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  phoneAux1: z.string().nullable().optional(),
  phoneAux2: z.string().nullable().optional(),
  wechatId: z.string().nullable().optional(),
  wechatAux1: z.string().nullable().optional(),
  wechatAux2: z.string().nullable().optional(),

  resourceAttribute: z.enum(["PENDING","VALID","INVALID","EXPIRED"]).optional(),
  invalidReason: z.string().nullable().optional(),

  primaryChannelId: z.string().nullable().optional(),
  channelLocation:  z.string().nullable().optional(),
  sourceDetail:     z.string().nullable().optional(),
  sourceCampus:     z.string().nullable().optional(),
  customChannelName: z.string().nullable().optional(),

  degreeType:   z.string().nullable().optional(),
  subjectArea:  z.string().nullable().optional(),
  targetMajorId: z.string().nullable().optional(),
  specificDirection: z.string().nullable().optional(),
  currentSchool: z.string().nullable().optional(),
  currentMajor:  z.string().nullable().optional(),
  isMajorAligned: z.boolean().nullable().optional(),
  schoolTierId: z.string().nullable().optional(),
  grade:        z.string().nullable().optional(),
  graduationYear: z.coerce.number().nullable().optional(),
  province: z.string().nullable().optional(),
  city:     z.string().nullable().optional(),
  identityKind: z.enum(["STUDENT","PARENT","KIN"]).nullable().optional(),
  jlpt: z.enum(["N1","N2","N3_N4","N5_OR_BELOW","STUDYING","UNKNOWN"]).nullable().optional(),
  englishLevel: z.string().nullable().optional(),
  japanStatus:  z.string().nullable().optional(),
  langSchoolStatus: z.enum(["NOT_APPLIED","NO_NEED","ENROLLED","APPLIED_WAITING","UNKNOWN"]).nullable().optional(),
  langSchoolEnrollMonth: z.string().nullable().optional(),

  conversionProbability: z.coerce.number().min(0).max(100).optional(),
  nextAction: z.string().nullable().optional(),
  nextActionDueAt: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!["ADMIN","SALES","CHANNEL","MARKETING","HEAD"].includes(me.role)) {
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

    // Auto-log activity when resourceAttribute changes
    if (before && parsed.data.resourceAttribute && before.resourceAttribute !== parsed.data.resourceAttribute) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          authorId: me.id === "demo" ? null : me.id,
          kind: "STATUS_CHANGE",
          content: `资源属性 ${before.resourceAttribute} → ${parsed.data.resourceAttribute}`,
        },
      });
    }
    return NextResponse.json(lead);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
