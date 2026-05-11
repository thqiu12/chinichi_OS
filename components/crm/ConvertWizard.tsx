"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ConvertWizard({
  leadId,
  leadName,
  defaultTarget,
  divisions,
  mentors,
}: {
  leadId: string;
  leadName: string;
  defaultTarget?: string | null;
  divisions: { id: string; name: string; kind: string }[];
  mentors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? "");
  const [mentorId, setMentorId] = useState(mentors[0]?.id ?? "");
  const [targetSchool, setTargetSchool] = useState(defaultTarget ?? "");
  const [targetMajor, setTargetMajor] = useState("");
  const [password, setPassword] = useState("1234");
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    if (!divisionId) return setErr("请选择事业部");
    if (!mentorId) return setErr("请选择班主任");
    start(async () => {
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divisionId, mentorId, targetSchool, targetMajor,
          studentPassword: password,
        }),
      });
      if (!res.ok) {
        setErr(await res.text() || "转化失败");
        return;
      }
      const student = await res.json();
      router.push(`/students/${student.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-800 leading-relaxed">
        <b>{leadName}</b> 成交 🎉 系统会自动完成：建 Student / 套用事业部 Deadline 模板 /
        写初始 TODO / 建学生账号 / Timeline 落"入学"milestone。
      </div>

      <Field label="事业部 *">
        <div className="grid grid-cols-3 gap-2">
          {divisions.map((d) => (
            <button key={d.id} type="button" onClick={() => setDivisionId(d.id)}
                    className={`rounded-xl px-3 h-10 text-sm border transition ${
                      divisionId === d.id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}>
              {d.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="升学班主任 *">
        <select value={mentorId} onChange={(e) => setMentorId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm bg-white">
          {mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          {mentors.length === 0 && <option value="">（没有班主任用户，先去 /admin 创建）</option>}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="目标校">
          <input value={targetSchool} onChange={(e) => setTargetSchool(e.target.value)}
                 placeholder="例如：東京大学"
                 className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm" />
        </Field>
        <Field label="专业">
          <input value={targetMajor} onChange={(e) => setTargetMajor(e.target.value)}
                 placeholder="例如：情報学"
                 className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm" />
        </Field>
      </div>

      <Field label="学生端初始密码">
        <input value={password} onChange={(e) => setPassword(e.target.value)}
               className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm" />
        <p className="text-[11px] text-slate-400 mt-1">学生登录邮箱默认为电话号（或自动生成）。</p>
      </Field>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <button onClick={submit} disabled={pending}
              className="w-full rounded-full bg-emerald-600 text-white py-3 text-sm font-medium disabled:opacity-60">
        {pending ? "处理中…" : "确认转 Student 🎉"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
