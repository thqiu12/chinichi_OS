import { fmtDateTime } from "@/lib/format";

const ICON: Record<string, string> = {
  LESSON: "📚", FOLLOWUP: "💬", TODO: "✅", DEADLINE: "⏰",
  MILESTONE: "🎉", RISK_CHANGE: "⚠️", APPLICATION: "📨",
  ECHO_LEARNING: "🎧", NOTE: "📝",
};

export function TimelineFeed({
  events,
}: {
  events: { id: string; kind: string; title: string; body: string | null; occurredAt: Date }[];
}) {
  if (events.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-400">还没有事件</div>;
  }
  return (
    <ol className="relative border-l border-slate-100 ml-3">
      {events.map((e) => (
        <li key={e.id} className="pl-5 pb-5 relative">
          <span className="absolute -left-[10px] top-1 w-[18px] h-[18px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px]">
            {ICON[e.kind] ?? "•"}
          </span>
          <div className="text-sm font-medium">{e.title}</div>
          {e.body && <div className="text-xs text-slate-500 mt-1 leading-relaxed">{e.body}</div>}
          <div className="text-[11px] text-slate-400 mt-1">{fmtDateTime(e.occurredAt)}</div>
        </li>
      ))}
    </ol>
  );
}
