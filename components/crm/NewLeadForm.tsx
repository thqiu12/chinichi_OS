"use client";
import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const STATUS = [
  { v: "NEW", label: "新" },
  { v: "CONTACTED", label: "已联系" },
  { v: "TRIAL", label: "试听" },
  { v: "NEGOTIATING", label: "意向" },
] as const;

const SOURCES = ["小红书","公众号","B站","抖音","推荐","搜索","线下活动","其他"];
const DEGREES = ["大学院","学部","美术","音乐","文理科","语言学校","其他"];

const REASON_LABEL: Record<string, string> = {
  PHONE: "📱 电话相同", WECHAT: "💬 微信相同", NAME: "👤 姓名相同",
};

type Match = {
  id: string; name: string; phone: string | null; wechatId: string | null;
  status: string; salesId: string | null; conversionProbability: number;
  createdAt: string; matchedOn: ("PHONE" | "WECHAT" | "NAME")[];
};

export function NewLeadForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wechat, setWechat] = useState("");
  const [source, setSource] = useState(SOURCES[0]);
  const [degree, setDegree] = useState(DEGREES[0]);
  const [status, setStatus] = useState<typeof STATUS[number]["v"]>("NEW");
  const [prob, setProb] = useState(20);
  const [nextAction, setNextAction] = useState("首次电话沟通");
  const [due, setDue] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // ── Dedupe state ──────────────────────────────────────
  const [matches, setMatches] = useState<Match[]>([]);
  const [checking, setChecking] = useState(false);
  const checkRef = useRef<number | null>(null);

  useEffect(() => {
    if (checkRef.current) window.clearTimeout(checkRef.current);
    if (!name && !phone && !wechat) { setMatches([]); return; }
    checkRef.current = window.setTimeout(async () => {
      setChecking(true);
      try {
        const qs = new URLSearchParams();
        if (phone)  qs.set("phone", phone);
        if (wechat) qs.set("wechatId", wechat);
        if (name)   qs.set("name", name);
        const r = await fetch(`/api/leads/check?${qs}`);
        if (r.ok) {
          const j = await r.json();
          setMatches(j.matches ?? []);
        }
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => { if (checkRef.current) window.clearTimeout(checkRef.current); };
  }, [name, phone, wechat]);

  const strongDups = matches.filter((m) =>
    m.matchedOn.includes("PHONE") || m.matchedOn.includes("WECHAT"),
  );
  const weakDups = matches.filter((m) =>
    !m.matchedOn.includes("PHONE") && !m.matchedOn.includes("WECHAT"),
  );

  function submit(force = false) {
    setErr(null);
    if (!name) return setErr("请填写姓名");
    start(async () => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, wechatId: wechat,
          sourceChannel: source, targetDegree: degree,
          status, conversionProbability: prob,
          nextAction, nextActionDueAt: new Date(due).toISOString(),
          notes, force,
        }),
      });
      if (res.status === 409) {
        const j = await res.json();
        setMatches(j.matches ?? []);
        setErr("检测到重复客户 ↑ 请确认。如确定是新客户，可点'仍然新建'。");
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        setErr(t || "保存失败（未连接数据库时会失败）");
        return;
      }
      const lead = await res.json();
      router.push(`/crm/leads/${lead.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="姓名 *">
          <input value={name} onChange={(e) => setName(e.target.value)}
                 className="input" placeholder="周晓雯" />
        </Field>
        <Field label="电话">
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
                 className="input" placeholder="138 0000 0000" />
        </Field>
        <Field label="微信号">
          <input value={wechat} onChange={(e) => setWechat(e.target.value)}
                 className="input" placeholder="wechat id" />
        </Field>
        <Field label="渠道">
          <select value={source} onChange={(e) => setSource(e.target.value)} className="input">
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="目标">
          <select value={degree} onChange={(e) => setDegree(e.target.value)} className="input">
            {DEGREES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="转化概率">
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={100} step={5}
                   value={prob} onChange={(e) => setProb(+e.target.value)}
                   className="flex-1" />
            <span className="w-10 text-right text-sm">{prob}%</span>
          </div>
        </Field>
      </div>

      <Field label="阶段">
        <div className="flex flex-wrap gap-2">
          {STATUS.map((s) => (
            <button key={s.v} type="button" onClick={() => setStatus(s.v)}
                    className={`rounded-full px-3 h-8 text-xs border transition ${
                      status === s.v
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}>{s.label}</button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="下一步要做什么 *">
          <input value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="input" />
        </Field>
        <Field label="截止 *">
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="备注">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="input min-h-[90px]" placeholder="家长态度、预算、之前接触过哪些机构…" />
      </Field>

      {/* DUPLICATE PANEL */}
      {(strongDups.length > 0 || weakDups.length > 0 || checking) && (
        <DuplicatePanel
          strong={strongDups} weak={weakDups} checking={checking}
        />
      )}

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="flex gap-2">
        {strongDups.length > 0 ? (
          <>
            <Button onClick={() => submit(false)} disabled={pending} size="lg" variant="outline" className="flex-1">
              重新填
            </Button>
            <Button onClick={() => submit(true)} disabled={pending} size="lg" className="flex-1 bg-rose-600 hover:bg-rose-700">
              {pending ? "保存中…" : "仍然新建"}
            </Button>
          </>
        ) : (
          <Button onClick={() => submit(false)} disabled={pending} size="lg" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            {pending ? "保存中…" : "新建 Lead"}
          </Button>
        )}
      </div>

      <style>{`
        .input {
          width: 100%; border-radius: 12px;
          border: 1px solid rgb(226 232 240);
          padding: 0 12px; height: 44px; font-size: 14px; background: white;
        }
        textarea.input { height: auto; padding: 10px 12px; }
      `}</style>
    </div>
  );
}

function DuplicatePanel({
  strong, weak, checking,
}: {
  strong: Match[]; weak: Match[]; checking: boolean;
}) {
  if (strong.length === 0 && weak.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500">
        {checking ? "查重中…" : "✓ 无重复"}
      </div>
    );
  }
  return (
    <div className={`rounded-2xl border p-4 ${
      strong.length > 0
        ? "bg-rose-50 border-rose-200"
        : "bg-amber-50 border-amber-200"
    }`}>
      <div className={`text-sm font-medium ${
        strong.length > 0 ? "text-rose-800" : "text-amber-800"
      }`}>
        {strong.length > 0
          ? `⚠ 已存在 ${strong.length} 个强匹配客户（电话/微信相同）`
          : `ℹ 有 ${weak.length} 个可能相关的客户（仅姓名相同）`}
      </div>
      <ul className="mt-3 space-y-2">
        {[...strong, ...weak].slice(0, 5).map((m) => (
          <li key={m.id}>
            <Link href={`/crm/leads/${m.id}`} target="_blank"
                  className="flex items-center justify-between gap-2 rounded-xl bg-white border border-white/60 px-3 py-2 hover:border-slate-200">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {m.name}
                  <span className="ml-2 text-[11px] text-slate-500">{m.status}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {m.phone ?? "无电话"} · {m.wechatId ?? "无微信"} · 概率 {m.conversionProbability}%
                </div>
              </div>
              <div className="flex flex-wrap gap-1 shrink-0">
                {m.matchedOn.map((r) => (
                  <span key={r}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          r === "PHONE" || r === "WECHAT"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                    {REASON_LABEL[r]}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
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
