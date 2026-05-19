// One-off DB migration: translate legacy conversionStage values to the
// canonical 5-value vocabulary defined by the PRD hierarchy.
//
// Run once after upgrading dict.ts:
//   DATABASE_URL=$(grep ^DATABASE_URL_UNPOOLED= .env.local | cut -d= -f2- | tr -d '"') \
//     npx tsx prisma/migrate-stages.ts

import { PrismaClient } from "@prisma/client";
import { LEGACY_STAGE_MAP } from "../lib/dict";

const prisma = new PrismaClient();

async function main() {
  const allLeads = await prisma.lead.findMany({
    select: { id: true, conversionStage: true, advisorConfirmation: true },
  });

  const stats: Record<string, number> = {};
  let touched = 0;
  for (const l of allLeads) {
    const raw = l.conversionStage?.normalize("NFKC").trim() ?? null;
    if (!raw) continue;

    if (raw === "新获取") {
      await prisma.lead.update({
        where: { id: l.id },
        data: { conversionStage: null, advisorConfirmation: "PENDING" },
      });
      stats["新获取 → null + PENDING"] = (stats["新获取 → null + PENDING"] ?? 0) + 1;
      touched++;
      continue;
    }

    const mapped = LEGACY_STAGE_MAP[raw];
    if (mapped && mapped !== raw) {
      await prisma.lead.update({
        where: { id: l.id },
        data: {
          conversionStage: mapped,
          // If lead had a stage value, assume advisor saw 已确认意向 (else stage
          // wouldn't have been set in the legacy CRM).
          advisorConfirmation: l.advisorConfirmation ?? "INTENT_CONFIRMED",
        },
      });
      stats[`${raw} → ${mapped}`] = (stats[`${raw} → ${mapped}`] ?? 0) + 1;
      touched++;
    } else if (mapped === raw) {
      stats[`${raw} (kept)`] = (stats[`${raw} (kept)`] ?? 0) + 1;
    } else {
      stats[`${raw} (UNKNOWN, kept raw)`] = (stats[`${raw} (UNKNOWN, kept raw)`] ?? 0) + 1;
    }
  }

  console.log(`scanned ${allLeads.length} leads, mutated ${touched}.`);
  for (const [k, v] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
