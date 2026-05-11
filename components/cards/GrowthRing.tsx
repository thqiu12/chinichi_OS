import { stageLabel } from "@/lib/format";

export function GrowthRing({ value, stage }: { value: number; stage: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 36;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="rounded-2xl bg-white shadow-soft p-4 flex items-center gap-3">
      <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
        <circle cx="44" cy="44" r={r} stroke="#fff5e6" strokeWidth="10" fill="none" />
        <circle
          cx="44" cy="44" r={r}
          stroke="url(#g)" strokeWidth="10" strokeLinecap="round" fill="none"
          strokeDasharray={c} strokeDashoffset={off}
          transform="rotate(-90 44 44)"
        />
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stopColor="#ff9b34" />
            <stop offset="1" stopColor="#ea5e0a" />
          </linearGradient>
        </defs>
        <text x="44" y="48" textAnchor="middle" className="fill-slate-900"
              style={{ fontSize: 18, fontWeight: 600 }}>
          {pct}
        </text>
      </svg>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">成长进度</div>
        <div className="font-medium text-sm">{stageLabel(stage)}</div>
        <div className="text-[11px] text-slate-400 mt-1">每天前进一点点 ✨</div>
      </div>
    </div>
  );
}
