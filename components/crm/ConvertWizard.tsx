"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LeadSnapshot = {
  name: string;
  phone: string | null;
  wechatId: string | null;
  degreeType: string | null;
  subjectArea: string | null;
  jlpt: string | null;
  englishLevel: string | null;
  city: string | null;
  province: string | null;
  currentSchool: string | null;
};

type Credentials = { email: string; tempPassword: string };

export function ConvertWizard({
  leadId,
  leadName,
  defaultTarget,
  divisions,
  mentors,
  suggestedDivisionId,
  suggestedMentorId,
  snapshot,
  fromSign = false,
}: {
  leadId: string;
  leadName: string;
  defaultTarget?: string | null;
  divisions: { id: string; name: string; kind: string }[];
  mentors: { id: string; name: string }[];
  suggestedDivisionId?: string | null;
  suggestedMentorId?: string | null;
  snapshot?: LeadSnapshot | null;
  fromSign?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [divisionId, setDivisionId] = useState(suggestedDivisionId ?? divisions[0]?.id ?? "");
  const [mentorId, setMentorId] = useState(suggestedMentorId ?? mentors[0]?.id ?? "");
  const [targetSchool, setTargetSchool] = useState(defaultTarget ?? "");
  const [targetMajor, setTargetMajor] = useState("");
  const [password, setPassword] = useState("");        // empty = auto-generate
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ studentId: string; credentials: Credentials } | null>(null);

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
          studentPassword: password || undefined,
        }),
      });
      if (!res.ok) {
        setErr(await res.text() || "转化失败");
        return;
      }
      const j = await res.json();
      if (j.credentials) {
        setDone({ studentId: j.id, credentials: j.credentials });
      } else {
        // Already converted earlier — just navigate.
        router.push(`/students/${j.id}`);
      }
    });
  }

  if (done) {
    return <SuccessPanel studentId={done.studentId} credentials={done.credentials} leadName={leadName} />;
  }

  return (
    <div className="space-y-5">
      {fromSign && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
          ✓ <b>{leadName}</b> 签约成功 — 现在把数据交接给学生系统，开启学生页面。
        </div>
      )}

      {snapshot && (
        <details className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs">
          <summary className="cursor-pointer text-sm text-slate-700 font-medium">
            数据快照预览（将一并搬到学生档案）
          </summary>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600">
            {(["phone","wechatId","degreeType","subjectArea","jlpt","englishLevel","city","province","currentSchool"] as const).map((k) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-slate-400">{LABEL[k]}</dt>
                <dd className="font-mono truncate">{String(snapshot[k] ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <Field label="事业部 *" hint={suggestedDivisionId ? "已根据 学科属性+升学类型 自动建议" : undefined}>
        <div className="grid grid-cols-3 gap-2">
          {divisions.map((d) => (
            <button key={d.id} type="button" onClick={() => setDivisionId(d.id)}
                    className={`rounded-xl px-3 h-10 text-sm border transition ${
                      divisionId === d.id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}>
              {d.name}
              {d.id === suggestedDivisionId && <span className="ml-1 text-[10px]">推荐</span>}
            </button>
          ))}
        </div>
      </Field>

      <Field label="升学班主任 *">
        <select value={mentorId} onChange={(e) => setMentorId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm bg-white">
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}{m.id === suggestedMentorId ? " (推荐)" : ""}
            </option>
          ))}
          {mentors.length === 0 && <option value="">（没有班主任，去 /admin 创建）</option>}
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

      <Field label="学生端初始密码" hint="留空 = 自动生成 8 位强密码；交接后会显示给销售">
        <input value={password} onChange={(e) => setPassword(e.target.value)}
               placeholder="留空自动生成"
               className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm" />
      </Field>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <button onClick={submit} disabled={pending}
              className="w-full rounded-full bg-emerald-600 text-white py-3 text-sm font-medium disabled:opacity-60">
        {pending ? "交接中…" : "确认交接 · 开启学生页面 →"}
      </button>
    </div>
  );
}

function SuccessPanel({
  studentId, credentials, leadName,
}: { studentId: string; credentials: Credentials; leadName: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, what: string) {
    navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  }
  function copyAll() {
    const msg = `欢迎加入 Chinichi！
学生端登录：https://chinichi-os.vercel.app/student/home
邮箱：${credentials.email}
临时密码：${credentials.tempPassword}
首次登录后请尽快修改密码。`;
    copy(msg, "all");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
        <div className="text-lg font-semibold text-emerald-900">🎓 学生页面已开启</div>
        <p className="text-sm text-emerald-800 mt-1">
          {leadName} 已完成数据交接 — 班主任会在仪表盘看到这位新学生。
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
        <div className="text-sm font-medium text-slate-700">学生登录信息</div>
        <p className="text-[11px] text-slate-500">
          ⚠ 临时密码<strong>只在此处显示这一次</strong>。请通过企业微信 / 微信发给学生，
          学生首次登录后改密。
        </p>
        <CopyRow label="邮箱"     value={credentials.email}        copied={copied === "email"} onCopy={() => copy(credentials.email, "email")} />
        <CopyRow label="临时密码"  value={credentials.tempPassword} copied={copied === "pw"}    onCopy={() => copy(credentials.tempPassword, "pw")} mono />
        <button onClick={copyAll}
                className="w-full mt-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-3 h-10 text-sm">
          {copied === "all" ? "✓ 已复制完整通知" : "📋 一键复制完整通知文本"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a href={`/students/${studentId}`}
           className="rounded-full bg-slate-900 hover:bg-slate-800 text-white py-3 text-center text-sm">
          班主任视图 →
        </a>
        <a href="/student/home" target="_blank" rel="noreferrer"
           className="rounded-full bg-brand-600 hover:bg-brand-700 text-white py-3 text-center text-sm">
          学生端预览 ↗
        </a>
      </div>
    </div>
  );
}

function CopyRow({
  label, value, copied, onCopy, mono,
}: { label: string; value: string; copied: boolean; onCopy: () => void; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-16">{label}</span>
      <code className={`flex-1 text-sm rounded-lg bg-slate-50 px-3 py-1.5 truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </code>
      <button onClick={onCopy}
              className="rounded-lg border border-slate-200 hover:bg-slate-50 px-3 h-8 text-xs">
        {copied ? "✓" : "复制"}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

const LABEL: Record<string, string> = {
  phone: "电话", wechatId: "微信", degreeType: "升学类型", subjectArea: "学科属性",
  jlpt: "日语等级", englishLevel: "英语基础", city: "所在市", province: "所在省",
  currentSchool: "目前就读院校",
};
