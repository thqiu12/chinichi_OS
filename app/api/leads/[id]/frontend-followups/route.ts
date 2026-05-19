// 前端分配跟进 — only CHANNEL/MARKETING/ADMIN/HEAD can write.
// Multi-owner: adds owners to Lead.ownerIds, records added/removed in the follow-up
// itself so timeline can show "员工A 增加/减少了资源负责人: 员工B" per PRD 0723 §3.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const Body = z.object({
  communicationRef: z.string().optional(),
  assignedCampus:   z.string().optional(),
  addedOwnerIds:    z.array(z.string()).default([]),
  removedOwnerIds:  z.array(z.string()).default([]),
  invalidReason:    z.string().optional(),
  revisitDetail:    z.string().optional(),
  revisitAt:        z.coerce.date().optional(),
  revisitNote:      z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!["CHANNEL","MARKETING","ADMIN","HEAD"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden (frontend follow-up is for channel/marketing)" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const data = parsed.data;
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fu = await tx.frontendFollowUp.create({
        data: {
          leadId: params.id,
          authorId: me.id === "demo" ? null : me.id,
          communicationRef: data.communicationRef,
          assignedCampus: data.assignedCampus,
          assignedAt: data.addedOwnerIds.length > 0 ? now : undefined,
          addedOwnerIds: data.addedOwnerIds,
          removedOwnerIds: data.removedOwnerIds,
          invalidReason: data.invalidReason,
          revisitDetail: data.revisitDetail,
          revisitAt: data.revisitAt,
          revisitNote: data.revisitNote,
        },
      });

      // Update Lead.ownerIds and lastFrontendFollowUpAt
      const lead = await tx.lead.findUniqueOrThrow({ where: { id: params.id } });
      let owners = new Set(lead.ownerIds);
      for (const id of data.addedOwnerIds) owners.add(id);
      for (const id of data.removedOwnerIds) owners.delete(id);

      await tx.lead.update({
        where: { id: params.id },
        data: {
          ownerIds: [...owners],
          lastFrontendFollowUpAt: now,
        },
      });

      return fu;
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
