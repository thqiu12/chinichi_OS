"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtDate, daysUntil } from "@/lib/format";

const STATUSES = ["NEW","CONTACTED","TRIAL","NEGOTIATING","WON","LOST"] as const;
type S = typeof STATUSES[number];

const ORDER: Record<S, number> = {
  NEW: 0, CONTACTED: 1, TRIAL: 2, NEGOTIATING: 3, WON: 4, LOST: 5,
};

export function PipelineCard({
  lead,
}: {
  lead: {
    id: string; name: string; status: S;
    targetDegree: string | null;
    sourceChannel: string | null;
    nextAction: string | null;
    nextActionDueAt: Date | null;
    conversionProbability: number;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<S>(lead.status);
  const days = lead.nextActionDueAt ? daysUntil(new Date(lead.nextActionDueAt)) : null;

  function move(target: S) {
    if (target === status) return;
    const prev = status;
    setStatus(target);
    start(async () => {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (!res.ok) setStatus(prev);
      else router.refresh();
    });
  }

  const canPrev = ORDER[status] > 0 && status !== "LOST" && status !== "WON";
  const canNext = ORDER[status] < 4 && status !== "LOST";

  return (
    <div className={`block rounded-xl bg-white shadow-soft px-3 py-2.5 ${pending ? "opacity-60" : ""}`}>
      <Link href={`/crm/leads/${lead.id}`} className="block">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{lead.name}</div>
          <div className="text-[11px] text-slate-500">{lead.conversionProbability}%</div>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {lead.targetDegree ?? "—"} · {lead.sourceChannel ?? "—"}
        </div>
        {lead.nextAction && (
          <div className="text-[11px] text-slate-600 mt-1 line-clamp-1">→ {lead.nextAction}</div>
        )}
        {lead.nextActionDueAt && (
          <div className={`text-[11px] mt-1 ${
            days !== null && days <= 0 ? "text-rose-600" : "text-slate-400"
          }`}>
            {fmtDate(lead.nextActionDueAt)}
            {days !== null && (days <= 0 ? " · 今天/逾期" : ` · ${days}d`)}
          </div>
        )}
      </Link>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
        <button
          disabled={!canPrev || pending}
          onClick={() => canPrev && move(STATUSES[ORDER[status] - 1])}
          className="text-[11px] text-slate-500 disabled:text-slate-300 hover:text-slate-800 px-1"
        >← 退</button>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => move(e.target.value as S)}
          className="flex-1 text-[11px] text-slate-600 bg-transparent border-0 outline-none text-center"
        >
          <option value="NEW">新</option>
          <option value="CONTACTED">已联系</option>
          <option value="TRIAL">试听</option>
          <option value="NEGOTIATING">意向</option>
          <option value="WON">成交</option>
          <option value="LOST">流失</option>
        </select>
        <button
          disabled={!canNext || pending}
          onClick={() => canNext && move(STATUSES[ORDER[status] + 1])}
          className="text-[11px] text-emerald-700 disabled:text-slate-300 hover:text-emerald-800 px-1"
        >推 →</button>
      </div>
    </div>
  );
}
