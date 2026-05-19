// Dictionary constants for CRM 2.0. The big trees (Channel/Major/SchoolTier) live
// in the DB and are seeded from prisma/seed-dict.ts. The small fixed lists below
// are kept here for type-safety and quick UI lookups.

// 升学类型 (附录2.升学类型)
export const DEGREE_TYPES = [
  "日本高中", "通信制高中", "学部", "学部编入",
  "大学院-修士", "大学院-博士", "研究生", "专升硕",
  "医学直博", "SGU申请", "专门学校", "语校申请",
  "语言学习", "其他", "暂未知",
] as const;

// 学科属性 (附录2.学科属性)
export const SUBJECT_AREAS = [
  "文科", "理科", "美术", "音乐", "体育",
  "日语", "其他", "暂未知",
] as const;

// 英语基础
export const ENGLISH_LEVELS = [
  "托福", "托业", "雅思", "CET4", "CET6", "无标化成绩",
] as const;

// 有效资源转化阶段
// Per PRD: 资源属性=有效 → 顾问确认 ∈ {待判定, 已确认意向, 失效}, and ONLY when
// 顾问确认=已确认意向 do these 6 conversionStage values apply.
// 当月分配当月签约 vs 签约 — both are signed contracts, the former is the
// faster-funnel signal (assigned and signed within the same month); the latter
// is older pipeline finally converting this month.
export const CONVERSION_STAGES = [
  "挖需中",            // probing / discovery
  "机会资源",          // hot opportunity
  "长线资源",          // slow burn, long-tail
  "当月分配当月签约",   // same-month assigned + signed → triggers Contract
  "签约",              // signed this month (older lead) → triggers Contract
  "输单",              // lost
] as const;

// Legacy stage values found in existing CRM exports — map to the new 6-value
// vocabulary on import. Anything not in this map keeps its raw string but
// won't show up in the pipeline column grid.
// 已签约/老生续费 → 签约 (we can't reconstruct "assigned this month?" from a
// historical export, so we default to the safer non-当月分配 label; sales can
// flip a row to 当月分配当月签约 manually if they know it was same-month).
export const LEGACY_STAGE_MAP: Record<string, string> = {
  "初步接触":      "挖需中",
  "深度沟通":      "挖需中",
  "试听":          "机会资源",
  "意向待定":      "长线资源",
  "报价":          "机会资源",
  "已出合同待签约": "机会资源",
  "已签约":        "签约",
  "老生续费":      "签约",
  // Keep these as-is (they're already in the new vocab):
  "挖需中":            "挖需中",
  "机会资源":          "机会资源",
  "长线资源":          "长线资源",
  "当月分配当月签约":  "当月分配当月签约",
  "签约":              "签约",
  "输单":              "输单",
  // 新获取 doesn't fit the 已确认意向 sub-tier — caller should reset
  // conversionStage = null and advisorConfirmation = PENDING for these.
};

// Stages that should NOT show the reminder/visit/trial UI on a follow-up form
// (no further follow-up scheduling once the deal is closed/lost).
export const TERMINAL_STAGES = new Set<string>(["当月分配当月签约", "签约", "输单"]);

// Stages that should trigger the Contract sub-panel. Both 当月分配当月签约 and
// 签约 are actual signings — the difference is reporting/funnel timing.
// 老生续费 is modeled as a checkbox on the Contract row (isRenewal=true).
export const CONTRACT_STAGES = new Set<string>(["当月分配当月签约", "签约"]);

// 无效原因 (when resourceAttribute = INVALID)
export const INVALID_REASONS = [
  "非目标用户", "用户失联", "待孵化", "学生需求不合理", "撞资源", "其他",
] as const;

// 输单原因
export const LOST_REASONS = [
  "价格不合适", "选择了其他机构", "家长反对", "学生放弃留学", "无法联系", "其他",
] as const;

// 失效原因
export const EXPIRED_REASONS = [
  "用户失联", "确认非目标用户", "重复资源", "其他",
] as const;

// 分配校区
export const CAMPUSES = [
  "成都", "上海", "广州", "武汉", "西安", "杭州", "东京", "其他", "自定义",
] as const;

// 前端回访详情 (xmind: 回访详情)
export const REVISIT_DETAILS = [
  "有效ing→机会资源",
  "有效ing→长线维护",
  "确认失效",
  "未知",
] as const;

// 年级
export const GRADES = [
  "高一", "高二", "高三",
  "大一", "大二", "大三", "大四",
  "硕士在读", "博士在读",
  "已毕业", "其他",
] as const;

// 赴日情况
export const JAPAN_STATUS_OPTIONS = [
  "尚未赴日", "已在日本", "计划赴日(已购票)", "签证办理中", "暂未知",
] as const;

// Resource attribute display label
export function resourceAttrLabel(v: string): { label: string; cls: string } {
  switch (v) {
    case "PENDING": return { label: "待判定", cls: "bg-slate-100 text-slate-700" };
    case "VALID":   return { label: "有效",   cls: "bg-emerald-100 text-emerald-800" };
    case "INVALID": return { label: "无效",   cls: "bg-slate-200 text-slate-500" };
    case "EXPIRED": return { label: "失效",   cls: "bg-rose-100 text-rose-700" };
    default:        return { label: v,        cls: "bg-slate-100 text-slate-700" };
  }
}

export function advisorConfirmLabel(v: string | null | undefined): { label: string; cls: string } {
  switch (v) {
    case "INTENT_CONFIRMED": return { label: "已确认意向", cls: "bg-emerald-100 text-emerald-800" };
    case "PENDING":          return { label: "顾问待判定", cls: "bg-slate-100 text-slate-700" };
    case "EXPIRED":          return { label: "顾问标记失效", cls: "bg-rose-100 text-rose-700" };
    default:                 return { label: "—",          cls: "bg-slate-50 text-slate-400" };
  }
}

export function conversionStageLabel(v: string | null | undefined): { label: string; cls: string } {
  if (!v) return { label: "—", cls: "bg-slate-50 text-slate-400" };
  if (v === "已签约")  return { label: v, cls: "bg-emerald-600 text-white" };
  if (v === "老生续费") return { label: v, cls: "bg-emerald-500 text-white" };
  if (v === "输单")    return { label: v, cls: "bg-slate-300 text-slate-700" };
  return { label: v, cls: "bg-amber-50 text-amber-800" };
}

// Resource-attribute → bucket order in UI (e.g. pipeline columns)
export const RESOURCE_ATTRIBUTE_ORDER = ["PENDING", "VALID", "INVALID", "EXPIRED"] as const;

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理员",
  CAMPUS_HEAD: "校区主管",
  DIVISION_HEAD: "事业部主管",
  MENTOR: "升学班主任",
  TEACHER: "教师",
  SALES: "咨询顾问",
  CHANNEL: "市场-渠道",
  MARKETING: "市场-品宣",
  HEAD: "主管/校长",
  STUDENT: "学生",
};
