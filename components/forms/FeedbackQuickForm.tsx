"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const TONES = [
  { v: "GREAT", label: "很好 ✨", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { v: "OKAY",  label: "一般 🙂", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  { v: "RISK",  label: "危险 ⚠️", cls: "bg-rose-50 text-rose-700 border-rose-200" },
] as const;

const PROBLEMS  = ["单词不足","拖延","作业未完成","阅读慢","发音不准","表达紧张","注意力不足","进度落后"];
const NEXTSTEPS = ["修改文书","继续练习","联系班主任","布置额外阅读","安排面试模拟","加单词量","课后陪练","调整目标"];

export function FeedbackQuickForm({
  lessonId, students,
}: {
  lessonId: string;
  students: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sid, setSid] = useState(students[0]?.id ?? "");
  const [tone, setTone] = useState<"GREAT"|"OKAY"|"RISK">("GREAT");
  const [problems, setProblems] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tog = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  function submit() {
    setErr(null); setDone(false);
    if (!sid) return setErr("请选择学生");
    start(async () => {
      const res = await fetch(`/api/lessons/${lessonId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: sid, tone, problems, nextSteps }),
      });
      if (!res.ok) { setErr(await res.text()); return; }
      setDone(true);
      setProblems([]); setNextSteps([]); setTone("GREAT");
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

      <Section title="本节状态">
        <div className="flex gap-2">
          {TONES.map((t) => (
            <button
              key={t.v} type="button" onClick={() => setTone(t.v)}
              className={`rounded-full px-4 h-10 text-sm border transition ${
                tone === t.v ? t.cls : "bg-white text-slate-600 border-slate-200"
              }`}
            >{t.label}</button>
          ))}
        </div>
      </Section>

      <Section title="今天观察到的问题">
        <Chips list={PROBLEMS} value={problems}
               onToggle={(v) => setProblems((s) => tog(s, v))} />
      </Section>

      <Section title="下一步推进">
        <Chips list={NEXTSTEPS} value={nextSteps}
               onToggle={(v) => setNextSteps((s) => tog(s, v))} />
      </Section>

      <p className="text-xs text-slate-400">
        提交后 AI 会自动扩写成完整反馈，并把"下一步"自动转成学生 TODO。
      </p>

      {err && <div className="text-sm text-rose-600">{err}</div>}
      {done && <div className="text-sm text-emerald-600">✓ 已提交，AI 已生成反馈</div>}

      <Button onClick={submit} disabled={pending} size="lg" className="w-full">
        {pending ? "提交中…" : "一键提交"}
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Chips({
  list, value, onToggle,
}: { list: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((t) => (
        <button
          key={t} type="button" onClick={() => onToggle(t)}
          className={`rounded-full px-3 h-8 text-xs border transition ${
            value.includes(t)
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200"
          }`}
        >{t}</button>
      ))}
    </div>
  );
}
