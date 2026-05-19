import { fmtDateTime, fmtDate } from "@/lib/format";

// Unified timeline item: merges AdvisorFollowUp + FrontendFollowUp + LeadActivity.
export type TimelineItem =
  | {
      kind: "ADVISOR";
      id: string;
      authorName: string | null;
      createdAt: Date;
      advisorConfirmation: string;
      conversionStage: string | null;
      detail: string;
      visitedOffice: boolean;
      attendedTrial: boolean;
      expiredReason: string | null;
      lostReason: string | null;
      reminderDays: number | null;
    }
  | {
      kind: "FRONTEND";
      id: string;
      authorName: string | null;
      createdAt: Date;
      communicationRef: string | null;
      revisitNote: string | null;
      revisitDetail: string | null;
      assignedCampus: string | null;
      addedOwnerNames: string[];
      removedOwnerNames: string[];
      invalidReason: string | null;
    }
  | {
      kind: "ACTIVITY";
      id: string;
      createdAt: Date;
      actKind: string;
      content: string;
      result: string | null;
    };

const CONFIRM_LABEL: Record<string, string> = {
  INTENT_CONFIRMED: "已确认意向",
  PENDING: "顾问待判定",
  EXPIRED: "顾问标记失效",
};

const CONFIRM_TONE: Record<string, string> = {
  INTENT_CONFIRMED: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-slate-100 text-slate-700",
  EXPIRED: "bg-rose-100 text-rose-700",
};

const ACT_ICON: Record<string, string> = {
  CALL: "📞", MESSAGE: "💬", MEETING: "🤝", TRIAL_LESSON: "🎓",
  NOTE: "📝", STATUS_CHANGE: "🔁",
};

export function UnifiedTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-400">还没有跟进记录</div>;
  }
  return (
    <ol className="relative border-l border-slate-100 ml-3 space-y-1">
      {items.map((it) => (
        <li key={`${it.kind}-${it.id}`} className="pl-5 pb-5 relative">
          <span className={`absolute -left-[10px] top-1 w-[18px] h-[18px] rounded-full border flex items-center justify-center text-[10px] ${
            it.kind === "ADVISOR"  ? "bg-emerald-50 border-emerald-300"
            : it.kind === "FRONTEND" ? "bg-blue-50 border-blue-300"
            : "bg-white border-slate-200"
          }`}>
            {it.kind === "ADVISOR" ? "顾" : it.kind === "FRONTEND" ? "渠" : (ACT_ICON[it.actKind] ?? "•")}
          </span>

          {it.kind === "ADVISOR" && <AdvisorRow it={it} />}
          {it.kind === "FRONTEND" && <FrontendRow it={it} />}
          {it.kind === "ACTIVITY" && <ActivityRow it={it} />}
        </li>
      ))}
    </ol>
  );
}

function AdvisorRow({ it }: { it: Extract<TimelineItem, { kind: "ADVISOR" }> }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">咨询顾问跟进</span>
          <span className="text-[11px] text-slate-500">{it.authorName ?? "—"}</span>
        </div>
        <div className="text-[11px] text-slate-400">{fmtDateTime(it.createdAt)}</div>
      </div>

      {/* Two-row keyword summary per PRD 0723 §4 */}
      <div className="flex flex-wrap gap-1 mt-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${CONFIRM_TONE[it.advisorConfirmation]}`}>
          {CONFIRM_LABEL[it.advisorConfirmation] ?? it.advisorConfirmation}
        </span>
        {it.conversionStage && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
            {it.conversionStage}
          </span>
        )}
        {it.visitedOffice && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">上门 ✓</span>
        )}
        {it.attendedTrial && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">试听 ✓</span>
        )}
        {it.reminderDays != null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            提醒 {it.reminderDays}天
          </span>
        )}
      </div>

      <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{it.detail}</p>

      {(it.expiredReason || it.lostReason) && (
        <div className="mt-1.5 text-xs text-rose-700">
          {it.expiredReason && <span>失效原因：{it.expiredReason}</span>}
          {it.lostReason && <span>输单原因：{it.lostReason}</span>}
        </div>
      )}
    </>
  );
}

function FrontendRow({ it }: { it: Extract<TimelineItem, { kind: "FRONTEND" }> }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">前端分配跟进</span>
          <span className="text-[11px] text-slate-500">{it.authorName ?? "—"}</span>
        </div>
        <div className="text-[11px] text-slate-400">{fmtDateTime(it.createdAt)}</div>
      </div>

      {it.assignedCampus && (
        <div className="text-[11px] text-blue-700 mt-1">分配到 {it.assignedCampus}</div>
      )}

      {/* Two-row summary per PRD: 前端沟通参考 + 前端回访备注 */}
      {it.communicationRef && (
        <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{it.communicationRef}</p>
      )}
      {it.revisitNote && (
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">↳ {it.revisitNote}</p>
      )}

      <div className="flex flex-wrap gap-1 mt-1.5">
        {it.revisitDetail && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{it.revisitDetail}</span>
        )}
        {it.invalidReason && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">无效: {it.invalidReason}</span>
        )}
      </div>

      {(it.addedOwnerNames.length > 0 || it.removedOwnerNames.length > 0) && (
        <div className="mt-1.5 text-[11px] text-slate-500">
          {it.addedOwnerNames.length > 0 && <>增加负责人: {it.addedOwnerNames.join("、")}</>}
          {it.removedOwnerNames.length > 0 && <>{" / "}移除: {it.removedOwnerNames.join("、")}</>}
        </div>
      )}
    </>
  );
}

function ActivityRow({ it }: { it: Extract<TimelineItem, { kind: "ACTIVITY" }> }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-600">{it.actKind}</div>
        <div className="text-[11px] text-slate-400">{fmtDateTime(it.createdAt)}</div>
      </div>
      <p className="text-sm text-slate-700 mt-1 leading-relaxed">{it.content}</p>
      {it.result && <p className="text-xs text-emerald-700 mt-1">结果: {it.result}</p>}
    </>
  );
}
