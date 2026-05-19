"use client";
import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const ATTRS = [
  { v: "PENDING",  label: "待判定" },
  { v: "VALID",    label: "有效"   },
  { v: "INVALID",  label: "无效"   },
  { v: "EXPIRED",  label: "失效"   },
] as const;

const SOURCES = ["小红书","公众号","B站","抖音","推荐","搜索","线下活动","其他"];
const DEGREES = ["大学院","学部","美术","音乐","文理科","语言学校","其他"];

const REASON_LABEL: Record<string, string> = {
  WECHAT: "💬 微信相同", PHONE: "📱 电话相同", NAME: "👤 姓名相同",
};

type Match = {
  id: string; name: string; phone: string | null; wechatId: string | null;
  resourceAttribute: string;
  conversionStage: string | null;
  advisorConfirmation: string | null;
  salesId: string | null; conversionProbability: number;
  createdAt: string;
  matchedOn: ("WECHAT" | "PHONE" | "NAME")[];
  strength: "STRONG" | "WEAK";
};

const ATTR_LABEL: Record<string, string> = {
  PENDING: "待判定", VALID: "有效", INVALID: "无效", EXPIRED: "失效",
};

export function NewLeadForm({
  initialName = "",
  initialWechat = "",
  initialPhone = "",
  forced = false,
}: {
  initialName?: string;
  initialWechat?: string;
  initialPhone?: string;
  forced?: boolean;
} = {}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(initialName);
  const [wechat, setWechat] = useState(initialWechat);
  const [phone, setPhone] = useState(initialPhone);
  const [source, setSource] = useState(SOURCES[0]);
  const [degree, setDegree] = useState(DEGREES[0]);
  const [attr, setAttr] = useState<typeof ATTRS[number]["v"]>("PENDING");
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
        if (wechat) qs.set("wechatId", wechat);
        if (phone)  qs.set("phone", phone);
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

  // Classify by strongest reason
  const wechatDups = matches.filter((m) => m.matchedOn[0] === "WECHAT");
  const phoneDups  = matches.filter((m) => m.matchedOn[0] === "PHONE");
  const nameDups   = matches.filter((m) => m.matchedOn[0] === "NAME");
  const blockingDups = wechatDups.length > 0 || phoneDups.length > 0;

  function submit(forceArg = false) {
    setErr(null);
    if (!name) return setErr("请填写姓名");
    const force = forceArg || forced;
    start(async () => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, wechatId: wechat,
          // Phase 1: source / degree from form become free-text placeholders.
          // Phase 3 will hook them up to Channel / DegreeType dictionaries.
          sourceDetail: `渠道: ${source}`,
          degreeType: degree,
          resourceAttribute: attr,
          conversionProbability: prob,
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
      {/* Step indicator */}
      <ol className="flex items-center gap-3 text-xs text-slate-500">
        <li className="flex items-center gap-2 text-emerald-600">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px]">✓</span>
          已查重
        </li>
        <li className="h-px flex-1 bg-emerald-200" />
        <li className="flex items-center gap-2 text-emerald-700 font-medium">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">2</span>
          填客户信息
        </li>
      </ol>

      {forced && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
          ⚠ 你已确认要新建一个与现有客户相似的 lead。保存时仍会通过查重防护。
        </div>
      )}

      {/* Name first */}
      <Field label="姓名 *">
        <input value={name} onChange={(e) => setName(e.target.value)}
               className="input" placeholder="周晓雯" />
      </Field>

      {/* WeChat — primary identity */}
      <Field
        label="微信号 *"
        hint="✦ 推荐优先填——一人一号，查重最准"
        emphasized
      >
        <input value={wechat} onChange={(e) => setWechat(e.target.value)}
               className="input input-primary" placeholder="zhouxw" />
      </Field>

      {/* Phone — secondary */}
      <Field label="电话" hint="家长共享号常见，仅做辅助查重">
        <input value={phone} onChange={(e) => setPhone(e.target.value)}
               className="input" placeholder="138 0000 0000" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <Field label="转化概率">
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} step={5}
                 value={prob} onChange={(e) => setProb(+e.target.value)}
                 className="flex-1" />
          <span className="w-10 text-right text-sm">{prob}%</span>
        </div>
      </Field>

      <Field label="资源属性">
        <div className="flex flex-wrap gap-2">
          {ATTRS.map((s) => (
            <button key={s.v} type="button" onClick={() => setAttr(s.v)}
                    className={`rounded-full px-3 h-8 text-xs border transition ${
                      attr === s.v
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
      <DuplicatePanel
        wechat={wechatDups} phone={phoneDups} name={nameDups}
        checking={checking}
        anyInput={Boolean(name || phone || wechat)}
      />

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="flex gap-2">
        {blockingDups ? (
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
        .input-primary {
          border-color: rgb(16 185 129);
          box-shadow: 0 0 0 3px rgb(209 250 229);
        }
        textarea.input { height: auto; padding: 10px 12px; }
      `}</style>
    </div>
  );
}

function DuplicatePanel({
  wechat, phone, name, checking, anyInput,
}: {
  wechat: Match[]; phone: Match[]; name: Match[];
  checking: boolean; anyInput: boolean;
}) {
  if (!anyInput && !checking) return null;
  const total = wechat.length + phone.length + name.length;

  if (total === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500">
        {checking ? "查重中…" : "✓ 无重复"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {wechat.length > 0 && (
        <Band tone="rose" title={`🚨 微信完全相同 · ${wechat.length}（几乎肯定是同一人）`}>
          {wechat.map((m) => <MatchRow key={m.id} m={m} />)}
        </Band>
      )}
      {phone.length > 0 && (
        <Band tone="amber" title={`⚠ 电话相同 · ${phone.length}（可能家长共享号，请确认微信）`}>
          {phone.map((m) => <MatchRow key={m.id} m={m} />)}
        </Band>
      )}
      {name.length > 0 && (
        <Band tone="slate" title={`ℹ 仅姓名相同 · ${name.length}（不阻塞新建，仅提示）`}>
          {name.map((m) => <MatchRow key={m.id} m={m} />)}
        </Band>
      )}
    </div>
  );
}

function Band({
  tone, title, children,
}: { tone: "rose" | "amber" | "slate"; title: string; children: React.ReactNode }) {
  const cls = tone === "rose"  ? "bg-rose-50 border-rose-200"
            : tone === "amber" ? "bg-amber-50 border-amber-200"
            :                    "bg-slate-50 border-slate-200";
  const head = tone === "rose"  ? "text-rose-800"
             : tone === "amber" ? "text-amber-800"
             :                    "text-slate-700";
  return (
    <div className={`rounded-2xl border p-3 ${cls}`}>
      <div className={`text-sm font-medium ${head}`}>{title}</div>
      <ul className="mt-2 space-y-1.5">{children}</ul>
    </div>
  );
}

function MatchRow({ m }: { m: Match }) {
  return (
    <li>
      <Link href={`/crm/leads/${m.id}`} target="_blank"
            className="flex items-center justify-between gap-2 rounded-xl bg-white border border-white/60 px-3 py-2 hover:border-slate-200">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-1.5 flex-wrap">
            {m.name}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{ATTR_LABEL[m.resourceAttribute] ?? m.resourceAttribute}</span>
            {m.conversionStage && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{m.conversionStage}</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            微信 {m.wechatId ?? "—"} · 电话 {m.phone ?? "—"} · 概率 {m.conversionProbability}%
          </div>
        </div>
        <div className="flex flex-wrap gap-1 shrink-0">
          {m.matchedOn.map((r) => (
            <span key={r}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    r === "WECHAT" ? "bg-rose-100 text-rose-700"
                    : r === "PHONE"  ? "bg-amber-100 text-amber-700"
                    :                  "bg-slate-100 text-slate-600"
                  }`}>
              {REASON_LABEL[r]}
            </span>
          ))}
        </div>
      </Link>
    </li>
  );
}

function Field({
  label, hint, emphasized, children,
}: {
  label: string;
  hint?: string;
  emphasized?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={`text-xs ${emphasized ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
        {label}
      </label>
      {hint && (
        <div className={`text-[11px] mt-0.5 ${emphasized ? "text-emerald-600" : "text-slate-400"}`}>
          {hint}
        </div>
      )}
      <div className="mt-1">{children}</div>
    </div>
  );
}
