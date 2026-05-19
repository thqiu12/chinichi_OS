"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ChannelsPanel({
  leadId,
  primary,
  secondary,
}: {
  leadId: string;
  primary: { id: string; name: string; parentName?: string | null } | null;
  secondary: { id: string; name: string; parentName?: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function promote(channelId: string) {
    start(async () => {
      const r = await fetch(`/api/leads/${leadId}/promote-channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-slate-500">首选渠道</div>
      {primary ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
          <div className="text-sm font-medium">{primary.name}</div>
          {primary.parentName && (
            <div className="text-[11px] text-slate-500">{primary.parentName}</div>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-400">未设置</div>
      )}

      {secondary.length > 0 && (
        <>
          <div className="text-[11px] text-slate-500 mt-3">其他渠道</div>
          {secondary.map((c) => (
            <div key={c.id}
                 className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm">{c.name}</div>
                {c.parentName && (
                  <div className="text-[11px] text-slate-500">{c.parentName}</div>
                )}
              </div>
              <button
                onClick={() => promote(c.id)}
                disabled={pending}
                className="shrink-0 rounded-full bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 text-[11px] px-2.5 h-7"
              >
                设为首选
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
