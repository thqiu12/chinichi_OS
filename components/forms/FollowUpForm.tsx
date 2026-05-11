"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const TAGS = ["状态稳定","推进顺利","拖延","情绪低","家长沟通","换目标","加压","减压"];
const RISK = [
  { v: "GREEN",  label: "稳定",   cls: "bg-emerald-50 text-emerald-700" },
  { v: "YELLOW", label: "需关注", cls: "bg-amber-50 text-amber-700" },
  { v: "RED",    label: "高风险", cls: "bg-rose-50 text-rose-700" },
] as const;

export function FollowUpForm({
  studentId, students,
}: {
  studentId?: string;
  students: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sid, setSid] = useState(studentId ?? students[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState("");
  const [due, setDue] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [risk, setRisk] = useState<"GREEN"|"YELLOW"|"RED">("GREEN");
  const [err, setErr] = useState<string | null>(null);

  function toggleTag(t: string) {
    setTags((s) => s.includes(t) ? s.filter((x) => x !== t) : [...s, t]);
  }

  function submit() {
    setErr(null);
    if (!sid) return setErr("请选择学生");
    if (content.length < 5) return setErr("跟进内容请写完整一点");
    if (nextAction.length < 2) return setErr("nextAction 必填——这是系统的核心");

    start(async () => {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: sid, content, tags, nextAction,
          nextActionDueAt: new Date(due).toISOString(),
          riskLevel: risk,
        }),
      });
      if (!res.ok) { setErr(await res.text()); return; }
      router.push(`/students/${sid}?tab=timeline`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <label className="text-xs text-slate-500">学生</label>
        <select
          value={sid} onChange={(e) => setSid(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 h-11 text-sm bg-white"
        >
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs text-slate-500">这次跟进了什么</label>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="今天聊了什么、看到什么状态、下了什么判断…"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[120px]"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500">标签</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button
              key={t} type="button" onClick={() => toggleTag(t)}
              className={`rounded-full px-3 h-7 text-xs border ${
                tags.includes(t)
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500">下一步要做什么 *</label>
          <input
            value={nextAction} onChange={(e) => setNextAction(e.target.value)}
            placeholder="例如：周三过研究计划书第二章"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 h-11 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">下一步截止 *</label>
          <input
            type="date" value={due} onChange={(e) => setDue(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 h-11 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500">当前风险</label>
        <div className="mt-1 flex gap-2">
          {RISK.map((r) => (
            <button
              key={r.v} type="button" onClick={() => setRisk(r.v)}
              className={`rounded-full px-3 h-8 text-xs border transition ${
                risk === r.v
                  ? `${r.cls} border-current`
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <Button onClick={submit} disabled={pending} size="lg" className="w-full">
        {pending ? "提交中…" : "提交跟进"}
      </Button>
    </div>
  );
}
