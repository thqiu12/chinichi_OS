"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const ATTRIBUTES = [
  { v: "PENDING",  label: "待判定", cls: "bg-slate-200 text-slate-800",      dot: "bg-slate-400" },
  { v: "VALID",    label: "有效",   cls: "bg-emerald-100 text-emerald-800",  dot: "bg-emerald-500" },
  { v: "INVALID",  label: "无效",   cls: "bg-slate-200 text-slate-500",      dot: "bg-slate-400" },
  { v: "EXPIRED",  label: "失效",   cls: "bg-rose-100 text-rose-700",        dot: "bg-rose-400" },
] as const;

type V = typeof ATTRIBUTES[number]["v"];

export function LeadAttributePill({
  leadId, initial,
}: { leadId: string; initial: V }) {
  const router = useRouter();
  const [value, setValue] = useState<V>(initial);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function change(v: V) {
    setOpen(false);
    if (v === value) return;
    const prev = value;
    setValue(v);
    start(async () => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceAttribute: v }),
      });
      if (!res.ok) setValue(prev);
      else router.refresh();
    });
  }

  const cur = ATTRIBUTES.find((s) => s.v === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className={`rounded-full px-3 h-8 text-xs font-medium ${cur.cls} ${pending ? "opacity-60" : ""}`}
      >
        {cur.label} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 bg-white border border-slate-100 shadow-card rounded-xl py-1 min-w-[120px]">
          {ATTRIBUTES.map((s) => (
            <button
              key={s.v} onClick={() => change(s.v)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${
                s.v === value ? "font-medium" : ""
              }`}>
              <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Back-compat alias for existing imports
export const LeadStatusPill = LeadAttributePill;

export function LeadInlineField({
  leadId, field, initial, type = "text", placeholder,
}: {
  leadId: string; field: string; initial: string | number | null;
  type?: "text" | "number" | "date"; placeholder?: string;
}) {
  const router = useRouter();
  const [val, setVal] = useState<string>(
    initial == null ? "" : type === "date" ? new Date(initial as any).toISOString().slice(0,10) : String(initial),
  );
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const display = val || placeholder || "—";

  function save() {
    setEditing(false);
    start(async () => {
      const payload =
        type === "number"
          ? { [field]: val === "" ? null : Number(val) }
          : type === "date"
          ? { [field]: val === "" ? null : new Date(val).toISOString() }
          : { [field]: val === "" ? null : val };
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) router.refresh();
    });
  }

  if (editing) {
    return (
      <input
        autoFocus type={type} value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-full rounded-lg border border-emerald-300 bg-white px-2 h-8 text-sm outline-none"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className={`w-full text-left text-sm rounded-lg px-2 h-8 hover:bg-slate-50 ${val ? "" : "text-slate-400"} ${pending ? "opacity-60" : ""}`}
    >
      {display}
    </button>
  );
}

export function LeadProbabilitySlider({
  leadId, initial,
}: { leadId: string; initial: number }) {
  const router = useRouter();
  const [val, setVal] = useState(initial);
  const [pending, start] = useTransition();

  function commit() {
    start(async () => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversionProbability: val }),
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input type="range" min={0} max={100} step={5}
             value={val} onChange={(e) => setVal(+e.target.value)} onMouseUp={commit} onTouchEnd={commit}
             className="flex-1" />
      <span className={`w-10 text-right text-sm font-medium ${pending ? "opacity-60" : ""}`}>{val}%</span>
    </div>
  );
}
