// Second migration: previously legacy 已签约 was over-eagerly mapped to
// 当月分配当月签约. The right mapping is 签约 (signed this month, older lead).
// Sales can manually flip rows that were actually same-month assigned.
//
// Run: DATABASE_URL=... npx tsx prisma/migrate-stages-v2.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.lead.updateMany({
    where: { conversionStage: "当月分配当月签约" },
    data:  { conversionStage: "签约" },
  });
  console.log(`reclassified ${r.count} leads: 当月分配当月签约 → 签约`);
  console.log(`(sales can flip back any that were actually same-month assigned.)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
