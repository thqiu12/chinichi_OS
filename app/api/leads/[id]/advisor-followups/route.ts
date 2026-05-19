// 咨询顾问跟进 — only SALES/ADMIN/HEAD can write.
// On create, caches the latest advisorConfirmation / conversionStage to Lead so
// list & filter queries don't need to traverse follow-ups. Per PRD: each follow-up
// is INDEPENDENT — past records aren't mutated by new ones (only the cached fields
// on Lead reflect the latest).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { CONTRACT_STAGES, TERMINAL_STAGES } from "@/lib/dict";
import { addDays } from "@/lib/utils";

const Body = z.object({
  advisorConfirmation: z.enum(["INTENT_CONFIRMED","PENDING","EXPIRED"]),
  isEffective: z.boolean().default(true),
  detail: z.string().min(2),
  conversionStage: z.string().optional(),
  visitedOffice: z.boolean().default(false),
  attendedTrial: z.boolean().default(false),
  expiredReason: z.string().optional(),
  lostReason:    z.string().optional(),
  reminderDays:  z.coerce.number().int().min(0).max(60).optional(),
  // Embedded contract (when stage in 已签约/老生续费)
  contract: z.object({
    amount:           z.coerce.number().optional(),
    signedAt:         z.coerce.date().optional(),
    toLanguageSchool: z.boolean(),
    languageSchool:   z.string().optional(),
  }).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!["SALES","ADMIN","HEAD"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden (advisor follow-up is sales-only)" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const data = parsed.data;
  const now = new Date();

  // PRD 0723: 失效 → no visit/trial/reminder; 已签约/老生续费/输单 → no reminder
  const isTerminal = data.conversionStage && TERMINAL_STAGES.has(data.conversionStage);
  const isExpired = data.advisorConfirmation === "EXPIRED";
  const allowVisitTrialReminder = !isTerminal && !isExpired;

  const reminderAt = allowVisitTrialReminder && data.reminderDays
    ? addDays(now, data.reminderDays)
    : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fu = await tx.advisorFollowUp.create({
        data: {
          leadId: params.id,
          authorId: me.id === "demo" ? null : me.id,
          advisorConfirmation: data.advisorConfirmation,
          isEffective: data.isEffective,
          detail: data.detail,
          conversionStage: data.conversionStage,
          visitedOffice: allowVisitTrialReminder ? data.visitedOffice : false,
          attendedTrial: allowVisitTrialReminder ? data.attendedTrial : false,
          expiredReason: isExpired ? data.expiredReason : null,
          lostReason: data.conversionStage === "输单" ? data.lostReason : null,
          reminderDays: allowVisitTrialReminder ? data.reminderDays : null,
          reminderAt,
        },
      });

      // Cache latest to Lead. Map advisorConfirmation=EXPIRED → resourceAttribute=EXPIRED.
      const update: any = {
        lastAdvisorFollowUpAt: now,
        advisorConfirmation: data.advisorConfirmation,
        ...(data.conversionStage ? { conversionStage: data.conversionStage } : {}),
      };
      if (isExpired) update.resourceAttribute = "EXPIRED";
      else if (data.advisorConfirmation === "INTENT_CONFIRMED" || data.advisorConfirmation === "PENDING") {
        // confirmed/pending → at least promote out of PENDING
        const before = await tx.lead.findUnique({ where: { id: params.id }, select: { resourceAttribute: true } });
        if (before?.resourceAttribute === "PENDING") update.resourceAttribute = "VALID";
      }
      await tx.lead.update({ where: { id: params.id }, data: update });

      // Contract panel (when stage triggers it)
      if (data.contract && data.conversionStage && CONTRACT_STAGES.has(data.conversionStage)) {
        await tx.contract.create({
          data: {
            leadId: params.id,
            triggeringFollowUpId: fu.id,
            amount: data.contract.amount,
            signedAt: data.contract.signedAt ?? now,
            isRenewal: data.conversionStage === "老生续费",
            toLanguageSchool: data.contract.toLanguageSchool,
            languageSchool: data.contract.toLanguageSchool ? data.contract.languageSchool : null,
          },
        });
      }

      return fu;
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
