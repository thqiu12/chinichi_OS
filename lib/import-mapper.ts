// Maps a row from either the legacy 86-col 客户列表 export or the 0827 18-col
// upload template into the canonical Lead create payload.
//
// All field names are matched by **header text** (the first non-empty row of the
// sheet), normalized by trim() + NFKC + remove all whitespace + lower-case.
// That way "⼿机号" (full-width char), "手机号", " 手机号 " all collapse to "手机号".

import { normalizePhone, normalizeWechat, normalizeName } from "./normalize";
import { LEGACY_STAGE_MAP } from "./dict";

/**
 * Translate a stage value coming from legacy data to the canonical 5-value
 * vocabulary. Returns:
 *   { stage: string|null, advisorConfirm: "PENDING"|null }
 * - null stage + PENDING advisor confirm → "新获取" or unrecognized
 * - mapped stage + null advisor confirm → caller can default advisor to
 *   INTENT_CONFIRMED (legacy data implies the lead made it to stage tier)
 */
function translateLegacyStage(raw: string | null | undefined):
  { stage: string | null; advisorConfirmHint: string | null } {
  if (!raw) return { stage: null, advisorConfirmHint: null };
  const t = raw.normalize("NFKC").trim();
  if (t === "新获取") return { stage: null, advisorConfirmHint: "PENDING" };
  const mapped = LEGACY_STAGE_MAP[t];
  if (mapped) return { stage: mapped, advisorConfirmHint: "INTENT_CONFIRMED" };
  // unknown — keep raw, let it surface in the UI as an unrecognized value
  return { stage: t, advisorConfirmHint: null };
}

export type RawRow = Record<string, any>;
export type FormatKind = "legacy" | "template" | "unknown";

function normalizeHeader(h: string): string {
  return h.normalize("NFKC").trim().replace(/\s+/g, "").toLowerCase();
}

/** Match a row's headers heuristically. Both formats have 姓名/微信号; legacy has
 *  ~50 unique cols beyond the template's 18, so we detect by presence of legacy-
 *  only headers. */
export function detectFormat(headers: string[]): FormatKind {
  const set = new Set(headers.map(normalizeHeader));
  const legacyOnly = [
    "顾问跟进详情", "有效资源转化阶段", "顾问确认", "客户跟进状态",
    "前端回访详情", "签约时间", "续费签约时间",
  ].map(normalizeHeader);
  const hits = legacyOnly.filter((h) => set.has(h)).length;
  if (hits >= 2) return "legacy";

  // 0827 template: 18 cols, has these unique to it
  if (set.has(normalizeHeader("资源来源（一级渠道）")) ||
      set.has(normalizeHeader("资源来源（一级）"))) {
    return "template";
  }
  if (hits === 0 && set.has(normalizeHeader("姓名/称呼"))) return "template";
  return "unknown";
}

/** Pick a value from the row by trying multiple header aliases (handles both
 *  full-width chars and minor naming drift across template versions). */
function pick(row: RawRow, ...aliases: string[]): string | null {
  const map = new Map<string, any>();
  for (const k of Object.keys(row)) map.set(normalizeHeader(k), row[k]);
  for (const a of aliases) {
    const v = map.get(normalizeHeader(a));
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

// ───────────── Enum mappers ─────────────
const JLPT_MAP: Record<string, string> = {
  "N1": "N1", "N2": "N2", "N3": "N3_N4", "N4": "N3_N4", "N3/N4": "N3_N4",
  "N5及以下（含0基础）": "N5_OR_BELOW", "N5及以下(含0基础)": "N5_OR_BELOW",
  "N5及以下": "N5_OR_BELOW",
  "学习中尚未考证": "STUDYING",
  "暂未知": "UNKNOWN",
};
function mapJLPT(v: string | null): string | undefined {
  if (!v) return undefined;
  const k = v.normalize("NFKC").trim();
  return JLPT_MAP[k];
}

const IDENTITY_MAP: Record<string, string> = {
  "学生": "STUDENT", "学⽣": "STUDENT",
  "家长": "PARENT",
  "其他亲友": "KIN", "亲友": "KIN",
};
function mapIdentity(v: string | null): string | undefined {
  if (!v) return undefined;
  return IDENTITY_MAP[v.normalize("NFKC").trim()];
}

const LANG_SCHOOL_MAP: Record<string, string> = {
  "尚未申请语校": "NOT_APPLIED",
  "无语校需求": "NO_NEED", "⽆语校需求": "NO_NEED",
  "已在语校就读": "ENROLLED",
  "已申请语校还未入学": "APPLIED_WAITING",
  "已申请语校尚未就读": "APPLIED_WAITING",
  "已申请语校还未⼊学": "APPLIED_WAITING",
  "暂未知": "UNKNOWN",
};
function mapLangSchool(v: string | null): string | undefined {
  if (!v) return undefined;
  return LANG_SCHOOL_MAP[v.normalize("NFKC").trim()];
}

const RESOURCE_ATTR_MAP: Record<string, string> = {
  "待判定": "PENDING",
  "有效": "VALID",
  "无效": "INVALID",
  "失效": "EXPIRED",
};
function mapResourceAttr(v: string | null): string {
  if (!v) return "PENDING";
  return RESOURCE_ATTR_MAP[v.normalize("NFKC").trim()] ?? "PENDING";
}

const ADVISOR_CONFIRM_MAP: Record<string, string> = {
  "已确认意向": "INTENT_CONFIRMED",
  "待判定": "PENDING",
  "失效": "EXPIRED",
};
function mapAdvisorConfirm(v: string | null): string | undefined {
  if (!v) return undefined;
  return ADVISOR_CONFIRM_MAP[v.normalize("NFKC").trim()];
}

function mapBool(v: string | null): boolean | undefined {
  if (!v) return undefined;
  const s = v.normalize("NFKC").trim();
  if (s === "是" || s === "Y" || s === "true") return true;
  if (s === "否" || s === "N" || s === "false") return false;
  return undefined;
}

function parseDateTime(v: string | null): Date | undefined {
  if (!v) return undefined;
  // Excel may give us numbers (serial dates); but our parser uses raw=false so
  // SheetJS pre-formats. Accept both ISO and "YYYY-MM-DD HH:mm:ss".
  const s = v.toString().trim();
  if (!s) return undefined;
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return undefined;
  return d;
}

function parseYear(v: string | null): number | undefined {
  if (!v) return undefined;
  const m = v.toString().match(/(20\d{2})/);
  return m ? Number(m[1]) : undefined;
}

// ─── Channel name → 3-level path resolver ───
// Caller passes a dictionary built from the seed (level 1 → name; level 2 by L1 id; level 3 by L2 id).
export type ChannelDict = {
  byLevelName: {
    L1: Map<string, string>;                              // L1 name → id
    L2: Map<string, Map<string, string>>;                 // L1 id → (L2 name → id)
    L3: Map<string, Map<string, string>>;                 // L2 id → (L3 name → id)
  };
};

export function resolveChannel(
  dict: ChannelDict,
  l1Name: string | null,
  l2Name: string | null,
  l3Name: string | null,
): { primaryChannelId: string | null; customChannelName?: string } {
  if (!l1Name) return { primaryChannelId: null };
  const l1id = dict.byLevelName.L1.get(l1Name.normalize("NFKC").trim());
  if (!l1id) {
    // Unknown L1 — store as customChannelName for later cleanup
    return { primaryChannelId: null, customChannelName: [l1Name, l2Name, l3Name].filter(Boolean).join(" / ") };
  }
  if (!l2Name) return { primaryChannelId: l1id };

  const l2Map = dict.byLevelName.L2.get(l1id);
  const l2NameNorm = l2Name.normalize("NFKC").trim();
  const l2id = l2Map?.get(l2NameNorm);

  // Special case: "自定义" means user added a node ad-hoc
  if (l2NameNorm === "自定义") {
    return { primaryChannelId: l1id, customChannelName: l3Name ?? l2Name };
  }
  if (!l2id) {
    return { primaryChannelId: l1id, customChannelName: [l2Name, l3Name].filter(Boolean).join(" / ") };
  }
  if (!l3Name) return { primaryChannelId: l2id };

  const l3Map = dict.byLevelName.L3.get(l2id);
  const l3NameNorm = l3Name.normalize("NFKC").trim();
  if (l3NameNorm === "自定义") return { primaryChannelId: l2id, customChannelName: l3Name };

  const l3id = l3Map?.get(l3NameNorm);
  if (l3id) return { primaryChannelId: l3id };
  return { primaryChannelId: l2id, customChannelName: l3Name };
}

// ─── Major lookup (一级 → 二级) ───
export type MajorDict = {
  byName: Map<string, string>;            // "情报学" → id (level 2 only)
  byPair: Map<string, string>;            // "理科|情报学" → id
};
export function resolveMajor(dict: MajorDict, l1: string | null, l2: string | null): string | undefined {
  if (l2) {
    const direct = dict.byName.get(l2.normalize("NFKC").trim());
    if (direct) return direct;
  }
  if (l1 && l2) {
    return dict.byPair.get(`${l1.normalize("NFKC").trim()}|${l2.normalize("NFKC").trim()}`);
  }
  return undefined;
}

// ─── SchoolTier lookup ───
export type SchoolTierDict = Map<string, string>;  // name → id (across categories)
export function resolveSchoolTier(dict: SchoolTierDict, name: string | null): string | undefined {
  if (!name) return undefined;
  // legacy data writes things like "文理类，日本学校（所有学段）" — try last segment after comma
  const cleaned = name.normalize("NFKC").replace(/[，,]+/g, "，").trim();
  // try exact match
  if (dict.has(cleaned)) return dict.get(cleaned);
  for (const seg of cleaned.split("，").reverse()) {
    const t = seg.trim();
    if (dict.has(t)) return dict.get(t);
  }
  return undefined;
}

// ─────────────────────────────────────────
// MAIN: map a legacy row to the create payload
// ─────────────────────────────────────────
export type ImportPayload = {
  lead: any;                                  // partial CreateLead
  advisorFollowUp?: any;                      // optional
  frontendFollowUp?: any;                     // optional
  contract?: any;                             // optional
  rawRowIndex: number;                        // for the report
};

export function mapLegacyRow(
  row: RawRow,
  rowIndex: number,
  dicts: { channels: ChannelDict; majors: MajorDict; tiers: SchoolTierDict },
): ImportPayload {
  // ── identity ──
  const name  = pick(row, "客户姓名", "姓名/称呼", "姓名");
  const phoneRaw = pick(row, "手机号", "⼿机号", "主手机号");
  const wechat   = pick(row, "微信号", "主微信号");
  const phoneArea = pick(row, "手机区号", "⼿机区号");

  // ── channel ──
  const l1 = pick(row, "资源来源（一级）", "资源来源（⼀级）", "资源来源（一级渠道）");
  const l2 = pick(row, "资源来源（二级）", "资源来源（⼆级）", "资源来源（二级渠道）");
  const l3 = pick(row, "来源信息（三级）", "来源信息（三级/账号）", "来源信息（三级渠道/账号）", "三级渠道");
  const channelLocation = pick(row, "渠道所在地");
  const channelName     = pick(row, "渠道名", "新增渠道名");
  const sourceDetail    = pick(row, "来源详情");
  const sourceCampus    = pick(row, "来源所属校区");
  const channelResolved = resolveChannel(dicts.channels, l1, l2, l3);

  // ── core attrs ──
  const degreeType  = pick(row, "升学类型");
  const subjectArea = pick(row, "学科属性");
  const targetMajorL2 = pick(row, "目标专业", "⽬标专业");
  const targetMajorId = resolveMajor(dicts.majors, subjectArea, targetMajorL2);
  const schoolTierId = resolveSchoolTier(dicts.tiers, pick(row, "院校层次"));

  // ── follow-up snapshot ──
  let advisorConfirm     = mapAdvisorConfirm(pick(row, "顾问确认"));
  const rawStage         = pick(row, "有效资源转化阶段", "客户跟进状态");
  const { stage: conversionStage, advisorConfirmHint } = translateLegacyStage(rawStage);
  // If the row only had a legacy stage (no explicit 顾问确认 column), infer:
  //  - "新获取" → 待判定
  //  - any 5-value stage → 已确认意向 (the stage implies the lead is in that tier)
  if (!advisorConfirm && advisorConfirmHint) {
    advisorConfirm = advisorConfirmHint as any;
  }
  const advisorDetail    = pick(row, "顾问跟进详情");
  const visitedOffice    = mapBool(pick(row, "是否上门")) ?? false;
  const attendedTrial    = mapBool(pick(row, "是否试听")) ?? false;
  const expiredReason    = pick(row, "失效原因");
  const lostReason       = pick(row, "输单原因");
  const reminderDaysRaw  = pick(row, "跟进提醒天数");

  const frontendComm  = pick(row, "前端沟通参考");
  const frontendCampus= pick(row, "分配校区");
  const frontendAt    = parseDateTime(pick(row, "分配时间"));
  const revisitDetail = pick(row, "前端回访详情");
  const revisitNote   = pick(row, "前端回访备注");
  const revisitAt     = parseDateTime(pick(row, "前端回访时间"));

  const signedAt        = parseDateTime(pick(row, "签约时间"));
  const contractAmount  = pick(row, "签约金额");
  const contractCurrency= pick(row, "签约币种");
  const toLangSchool    = mapBool(pick(row, "是否转接语校"));
  const langSchoolDest  = pick(row, "语校去向");
  const isRenewal       = mapBool(pick(row, "是否老生续费")) ?? false;

  const isMajorAligned = mapBool(pick(row, "是否与升学方向专业对口"));

  // Legacy data quirk: some rows have wechat-like text in the 手机号 column.
  // Only treat as a real phone if it's roughly numeric (digits/+-()/space only).
  const phoneLooksReal = phoneRaw ? /^[\d\s+\-()]{6,}$/.test(phoneRaw) : false;
  const phoneFinal = phoneLooksReal
    ? (phoneArea && !phoneRaw!.startsWith(phoneArea) ? `${phoneArea}${phoneRaw}` : phoneRaw)
    : null;

  const lead: any = {
    name,
    wechatId: wechat,
    phone: phoneFinal,
    phoneAux1: pick(row, "辅助手机号1", "辅助⼿机号1"),
    phoneAux2: pick(row, "辅助手机号2", "辅助⼿机号2"),
    wechatAux1: pick(row, "辅助微信号1"),
    wechatAux2: pick(row, "辅助微信号2"),
    notes: [pick(row, "其他备注"), pick(row, "其他信息")].filter(Boolean).join(" · ") || null,

    resourceAttribute: mapResourceAttr(pick(row, "资源属性")),
    invalidReason: pick(row, "无效原因"),

    primaryChannelId: channelResolved.primaryChannelId,
    customChannelName: channelResolved.customChannelName ?? channelName,
    channelLocation,
    sourceDetail,
    sourceCampus,

    degreeType,
    subjectArea,
    targetMajorId,
    schoolTierId,
    specificDirection: pick(row, "具体方向"),
    currentSchool: pick(row, "目前就读院校"),
    currentMajor: pick(row, "目前就读专业") ?? pick(row, "出身专业"),
    isMajorAligned,
    grade: pick(row, "年级"),
    graduationYear: parseYear(pick(row, "毕业时间")),
    city: pick(row, "学生所在城市"),
    identityKind: mapIdentity(pick(row, "身份")),
    jlpt: mapJLPT(pick(row, "日语基础")),
    englishLevel: pick(row, "英语基础"),
    japanStatus: pick(row, "赴日情况", "赴⽇情况"),
    langSchoolStatus: mapLangSchool(pick(row, "语校就读情况")) ?? mapLangSchool(pick(row, "语校情况")),
    langSchoolEnrollMonth: pick(row, "语校入学时间"),

    // Cached
    advisorConfirmation: advisorConfirm,
    conversionStage,
    force: true,    // we want to import even if dedupe finds same wechat — the runner decides
  };

  const advisorFollowUp = (advisorConfirm || advisorDetail || conversionStage)
    ? {
        advisorConfirmation: advisorConfirm ?? "PENDING",
        isEffective: mapBool(pick(row, "本次沟通是否为有效跟进")) ?? true,
        detail: advisorDetail || `(导入快照) ${conversionStage ?? ""}`,
        conversionStage: conversionStage || undefined,
        visitedOffice, attendedTrial,
        expiredReason: expiredReason || undefined,
        lostReason: lostReason || undefined,
        reminderDays: reminderDaysRaw ? Number(reminderDaysRaw) : undefined,
      }
    : undefined;

  const frontendFollowUp = (frontendComm || frontendCampus || revisitDetail || revisitNote)
    ? {
        communicationRef: frontendComm,
        assignedCampus: frontendCampus,
        assignedAt: frontendAt,
        revisitDetail: revisitDetail || undefined,
        revisitNote: revisitNote || undefined,
        revisitAt,
      }
    : undefined;

  const contract = signedAt
    ? {
        amount: contractAmount ? Number(String(contractAmount).replace(/[^\d.]/g, "")) : undefined,
        signedAt,
        toLanguageSchool: toLangSchool ?? false,
        languageSchool: langSchoolDest || undefined,
        isRenewal,
        meta: contractCurrency ? { currency: contractCurrency } : undefined,
      }
    : undefined;

  return { lead, advisorFollowUp, frontendFollowUp, contract, rawRowIndex: rowIndex };
}

export function mapTemplateRow(
  row: RawRow,
  rowIndex: number,
  dicts: { channels: ChannelDict; majors: MajorDict; tiers: SchoolTierDict },
): ImportPayload {
  // 0827 template uses slightly different headers; reuse legacy mapper which
  // already tries multiple aliases.
  return mapLegacyRow(row, rowIndex, dicts);
}
