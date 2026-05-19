"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export function DedupeGate() {
  const router = useRouter();
  const [wechat, setWechat] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const [matches, setMatches] = useState<Match[]>([]);
  const [checking, setChecking] = useState(false);
  const [touched, setTouched] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (ref.current) window.clearTimeout(ref.current);
    if (!wechat && !phone && !name) { setMatches([]); setTouched(false); return; }
    setTouched(true);
    ref.current = window.setTimeout(async () => {
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
    }, 350);
    return () => { if (ref.current) window.clearTimeout(ref.current); };
  }, [wechat, phone, name]);

  const wechatHits = matches.filter((m) => m.matchedOn[0] === "WECHAT");
  const phoneHits  = matches.filter((m) => m.matchedOn[0] === "PHONE");
  const nameHits   = matches.filter((m) => m.matchedOn[0] === "NAME");
  const strong = wechatHits.length + phoneHits.length;
  const onlyWeak = strong === 0 && nameHits.length > 0;
  const isClear = touched && !checking && matches.length === 0;

  function proceed(forced = false) {
    const qs = new URLSearchParams();
    qs.set("step", "form");
    if (wechat) qs.set("wechat", wechat);
    if (phone)  qs.set("phone", phone);
    if (name)   qs.set("name", name);
    if (forced) qs.set("forced", "1");
    router.push(`/crm/leads/new?${qs}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Step indicator */}
      <ol className="flex items-center gap-3 text-xs text-slate-500">
        <li className="flex items-center gap-2 text-emerald-700 font-medium">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">1</span>
          查重
        </li>
        <li className="h-px flex-1 bg-slate-200" />
        <li className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[11px]">2</span>
          填客户信息
        </li>
      </ol>

      {/* Primary: WeChat */}
      <div>
        <div className="text-sm font-medium text-emerald-700">💬 微信号</div>
        <div className="text-[11px] text-emerald-600 mt-0.5">一人一号，查重最准 — 优先填这个</div>
        <input
          autoFocus
          value={wechat}
          onChange={(e) => setWechat(e.target.value)}
          placeholder="zhouxw"
          className="mt-2 w-full rounded-2xl border-2 border-emerald-400 bg-white px-4 h-12 text-base outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      {/* Alt: phone / name */}
      <div>
        <div className="text-xs text-slate-400 mb-1.5">没有微信？也可用以下信息查重：</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="电话"
            className="rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="姓名"
            className="rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white"
          />
        </div>
      </div>

      {/* Live result region */}
      <ResultRegion
        touched={touched} checking={checking}
        wechat={wechatHits} phone={phoneHits} name={nameHits}
      />

      {/* CTA row */}
      <div className="flex gap-2">
        <Link href="/crm/leads"
              className="rounded-full px-4 h-11 inline-flex items-center text-sm border border-slate-200 text-slate-600 hover:bg-slate-50">
          取消
        </Link>

        {strong > 0 ? (
          <button onClick={() => proceed(true)}
                  className="flex-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white h-11 text-sm font-medium">
            ⚠ 仍然新建（不推荐）
          </button>
        ) : isClear ? (
          <button onClick={() => proceed(false)}
                  className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm font-medium">
            ✓ 没找到重复 · 继续填客户信息 →
          </button>
        ) : onlyWeak ? (
          <button onClick={() => proceed(false)}
                  className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm font-medium">
            继续填客户信息 →
          </button>
        ) : (
          <button disabled
                  className="flex-1 rounded-full bg-slate-200 text-slate-500 h-11 text-sm font-medium cursor-not-allowed">
            {touched ? "查重中…" : "请先输入微信号"}
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        系统也会在保存时做服务端二次校验，UI 被绕过也防得住。
      </p>
    </div>
  );
}

function ResultRegion({
  touched, checking, wechat, phone, name,
}: {
  touched: boolean; checking: boolean;
  wechat: Match[]; phone: Match[]; name: Match[];
}) {
  if (!touched) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
        输入微信号开始查重
      </div>
    );
  }
  if (checking && wechat.length + phone.length + name.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-100 py-4 text-center text-sm text-slate-500">
        查重中…
      </div>
    );
  }
  if (wechat.length + phone.length + name.length === 0) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
        ✓ 没找到重复客户，可以放心新建。
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {wechat.length > 0 && (
        <Band tone="rose" title={`🚨 微信完全相同 · ${wechat.length}（几乎肯定是同一人）`}
              tip="点'去跟进'继续处理现有客户，不要新建。">
          {wechat.map((m) => <MatchRow key={m.id} m={m} />)}
        </Band>
      )}
      {phone.length > 0 && (
        <Band tone="amber" title={`⚠ 电话相同 · ${phone.length}（可能家长共享号）`}
              tip="确认微信不同后再继续。">
          {phone.map((m) => <MatchRow key={m.id} m={m} />)}
        </Band>
      )}
      {name.length > 0 && (
        <Band tone="slate" title={`ℹ 仅姓名相同 · ${name.length}（弱可疑，不阻塞）`}>
          {name.map((m) => <MatchRow key={m.id} m={m} />)}
        </Band>
      )}
    </div>
  );
}

function Band({
  tone, title, tip, children,
}: {
  tone: "rose" | "amber" | "slate";
  title: string; tip?: string; children: React.ReactNode;
}) {
  const cls = tone === "rose"  ? "bg-rose-50 border-rose-200"
            : tone === "amber" ? "bg-amber-50 border-amber-200"
            :                    "bg-slate-50 border-slate-200";
  const head = tone === "rose"  ? "text-rose-800"
             : tone === "amber" ? "text-amber-800"
             :                    "text-slate-700";
  return (
    <div className={`rounded-2xl border p-3 ${cls}`}>
      <div className={`text-sm font-medium ${head}`}>{title}</div>
      {tip && <div className="text-[11px] mt-0.5 text-slate-500">{tip}</div>}
      <ul className="mt-2 space-y-1.5">{children}</ul>
    </div>
  );
}

function MatchRow({ m }: { m: Match }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-white/60 px-3 py-2">
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
        <Link href={`/crm/leads/${m.id}`}
              className="shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 h-8 inline-flex items-center">
          去跟进 →
        </Link>
      </div>
    </li>
  );
}
