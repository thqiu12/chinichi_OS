"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const KINDS = [
  { v: "CALL",         label: "📞 通话" },
  { v: "MESSAGE",      label: "💬 消息" },
  { v: "MEETING",      label: "🤝 面谈" },
  { v: "TRIAL_LESSON", label: "🎓 试听" },
  { v: "NOTE",         label: "📝 备注" },
] as const;

type Kind = typeof KINDS[number]["v"];

export function ActivityLogger({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<Kind>("CALL");
  const [content, setContent] = useState("");
  const [result, setResult] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    if (content.length < 2) return setErr("写点内容再提交");
    start(async () => {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind, content,
          result: result || undefined,
          nextAction: nextAction || undefined,
          nextActionDueAt: due ? new Date(due).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        setErr(await res.text() || "保存失败");
        return;
      }
      setContent(""); setResult(""); setNextAction(""); setDue("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-4">
      <div className="flex gap-1.5 flex-wrap mb-3">
        {KINDS.map((k) => (
          <button key={k.v} onClick={() => setKind(k.v)} type="button"
                  className={`rounded-full px-3 h-7 text-xs border ${
                    kind === k.v
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}>{k.label}</button>
        ))}
      </div>

      <textarea
        value={content} onChange={(e) => setContent(e.target.value)}
        placeholder="聊了什么、看到什么状态、判断…"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[72px] outline-none focus:border-emerald-400"
      />

      <div className="grid grid-cols-3 gap-2 mt-2">
        <input value={result} onChange={(e) => setResult(e.target.value)}
               placeholder="结果（可选）"
               className="rounded-xl border border-slate-200 px-3 h-9 text-xs" />
        <input value={nextAction} onChange={(e) => setNextAction(e.target.value)}
               placeholder="下一步（可选）"
               className="rounded-xl border border-slate-200 px-3 h-9 text-xs" />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
               className="rounded-xl border border-slate-200 px-3 h-9 text-xs" />
      </div>

      {err && <div className="text-xs text-rose-600 mt-2">{err}</div>}

      <div className="mt-3 flex justify-end">
        <button onClick={submit} disabled={pending}
                className="rounded-full bg-emerald-600 text-white px-4 h-9 text-sm disabled:opacity-60">
          {pending ? "记录中…" : "记一笔"}
        </button>
      </div>
    </div>
  );
}
