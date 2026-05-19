// Sanity-check the import mapper against a real xls file.
// Run: npx tsx prisma/test-import.ts /path/to/file.xls
import * as XLSX from "xlsx";
import { detectFormat, mapLegacyRow } from "../lib/import-mapper";

const path = process.argv[2];
if (!path) { console.error("Usage: tsx prisma/test-import.ts <xls path>"); process.exit(1); }

const wb = XLSX.readFile(path, { cellDates: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false });

console.log(`rows: ${rows.length}, headers: ${Object.keys(rows[0] ?? {}).length}`);
console.log(`detected: ${detectFormat(Object.keys(rows[0] ?? {}))}`);

// Empty dicts → tests the mapper's tolerance for missing channel matches
const dicts = {
  channels: { byLevelName: { L1: new Map(), L2: new Map(), L3: new Map() } },
  majors:   { byName: new Map(), byPair: new Map() },
  tiers:    new Map(),
};

let withWechat = 0, withPhone = 0, withName = 0;
let attrs: Record<string, number> = {};
let stages: Record<string, number> = {};
let badRows: { idx: number; reason: string }[] = [];

const samples = [0, 1, 2, 3, 4];

for (let i = 0; i < rows.length; i++) {
  try {
    const p = mapLegacyRow(rows[i], i + 2, dicts);
    if (p.lead.wechatId) withWechat++;
    if (p.lead.phone)    withPhone++;
    if (p.lead.name)     withName++;
    attrs[p.lead.resourceAttribute ?? "—"] = (attrs[p.lead.resourceAttribute ?? "—"] ?? 0) + 1;
    if (p.lead.conversionStage) stages[p.lead.conversionStage] = (stages[p.lead.conversionStage] ?? 0) + 1;
    if (samples.includes(i)) {
      console.log(`\n— row ${i + 2} —`);
      console.log(JSON.stringify({
        name: p.lead.name, wechatId: p.lead.wechatId, phone: p.lead.phone,
        resourceAttribute: p.lead.resourceAttribute,
        degreeType: p.lead.degreeType, subjectArea: p.lead.subjectArea,
        jlpt: p.lead.jlpt, langSchoolStatus: p.lead.langSchoolStatus,
        identityKind: p.lead.identityKind,
        primaryChannelId: p.lead.primaryChannelId,
        customChannelName: p.lead.customChannelName,
        advisorConfirmation: p.lead.advisorConfirmation,
        conversionStage: p.lead.conversionStage,
        hasAdvisorFollowUp: !!p.advisorFollowUp,
        hasFrontendFollowUp: !!p.frontendFollowUp,
        hasContract: !!p.contract,
      }, null, 2));
    }
  } catch (e) {
    badRows.push({ idx: i + 2, reason: (e as Error).message });
  }
}

console.log(`\n──── SUMMARY ────`);
console.log(`total rows:           ${rows.length}`);
console.log(`with name:            ${withName}`);
console.log(`with wechat:          ${withWechat}`);
console.log(`with phone:           ${withPhone}`);
console.log(`mapping errors:       ${badRows.length}`);
console.log(`resourceAttribute distribution:`, attrs);
console.log(`conversionStage distribution:`, stages);

if (badRows.length > 0) {
  console.log(`\nFirst 5 error rows:`);
  for (const e of badRows.slice(0, 5)) console.log(`  row ${e.idx}: ${e.reason}`);
}
