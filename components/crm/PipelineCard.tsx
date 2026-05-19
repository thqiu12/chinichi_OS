"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtDate, daysUntil } from "@/lib/format";
import { CONVERSION_STAGES } from "@/lib/dict";

export function PipelineCard({
  lead,
}: {
  lead: {
    id: string; name: string;
    conversionStage: string | null;
    degreeType: string | null;
    primaryChannel: { name: string } | null;
    nextAction: string | null;
    nextActionDueAt: Date | null;
    conversionProbability: number;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stage, setStage] = useState<string>(lead.conversionStage ?? CONVERSION_STAGES[0]);
  const days = lead.nextActionDueAt ? daysUntil(new Date(lead.nextActionDueAt)) : null;

  const idx = CONVERSION_STAGES.indexOf(stage as any);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < CONVERSION_STAGES.length - 1;

  function move(target: string) {
    if (target === stage) return;
    const prev = stage;
    setStage(target);
    start(async () => {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversionStage: target }),
      });
      if (!res.ok) setStage(prev);
      else router.refresh();
    });
  }

  return (
    <div className={`block rounded-xl bg-white shadow-soft px-3 py-2.5 ${pending ? "opacity-60" : ""}`}>
      <Link href={`/crm/leads/${lead.id}`} className="block">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{lead.name}</div>
          <div className="text-[11px] text-slate-500">{lead.conversionProbability}%</div>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {lead.degreeType ?? "—"} · {lead.primaryChannel?.name ?? "—"}
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
          onClick={() => canPrev && move(CONVERSION_STAGES[idx - 1])}
          className="text-[11px] text-slate-500 disabled:text-slate-300 hover:text-slate-800 px-1"
        >← 退</button>
        <select
          value={stage}
          disabled={pending}
          onChange={(e) => move(e.target.value)}
          className="flex-1 text-[11px] text-slate-600 bg-transparent border-0 outline-none text-center"
        >
          {CONVERSION_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          disabled={!canNext || pending}
          onClick={() => canNext && move(CONVERSION_STAGES[idx + 1])}
          className="text-[11px] text-emerald-700 disabled:text-slate-300 hover:text-emerald-800 px-1"
        >推 →</button>
      </div>
    </div>
  );
}
