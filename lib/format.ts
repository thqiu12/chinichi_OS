const tz = "Asia/Tokyo";

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz, month: "2-digit", day: "2-digit",
  }).format(date);
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz, month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

export function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

export function daysAgo(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

export function daysUntil(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

export function greet(): string {
  const h = new Date().getHours();
  if (h < 5) return "夜深了";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

export function stageLabel(s: string): string {
  const map: Record<string, string> = {
    ONBOARDING: "入学引导",
    FOUNDATION: "基础打底",
    EXAM_PREP: "考试冲刺",
    PORTFOLIO: "作品集制作",
    APPLICATION: "出愿准备",
    INTERVIEW: "面试准备",
    ADMITTED: "已合格 🎉",
    GRADUATED: "毕业",
  };
  return map[s] ?? s;
}

export function riskLabel(r: string): { label: string; cls: string; dot: string } {
  switch (r) {
    case "RED":    return { label: "高风险",  cls: "bg-rose-50 text-rose-700",      dot: "bg-rose-500" };
    case "YELLOW": return { label: "需关注",  cls: "bg-amber-50 text-amber-700",    dot: "bg-amber-500" };
    default:       return { label: "稳定",    cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  }
}

export function divisionLabel(k: string): string {
  return ({ ART:"美术", MUSIC:"音乐", GAKUBU:"学部", GRADUATE:"大学院",
            LIBERAL:"文理科", SHARED:"共享部门" } as Record<string,string>)[k] ?? k;
}
