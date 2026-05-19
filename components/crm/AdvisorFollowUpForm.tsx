"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CONVERSION_STAGES, TERMINAL_STAGES, CONTRACT_STAGES, EXPIRED_REASONS, LOST_REASONS } from "@/lib/dict";

const CONFIRMS = [
  { v: "INTENT_CONFIRMED", label: "已确认意向", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { v: "PENDING",          label: "待判定",     cls: "bg-slate-50 text-slate-700 border-slate-200" },
  { v: "EXPIRED",          label: "失效",       cls: "bg-rose-50 text-rose-700 border-rose-200" },
] as const;

export function AdvisorFollowUpForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmation, setConfirmation] = useState<typeof CONFIRMS[number]["v"]>("PENDING");
  const [isEffective, setIsEffective] = useState(true);
  const [detail, setDetail] = useState("");
  const [stage, setStage] = useState<string>("初步接触");
  const [visited, setVisited] = useState(false);
  const [trialed, setTrialed] = useState(false);
  const [expiredReason, setExpiredReason] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [reminderDays, setReminderDays] = useState<number | null>(null);

  // Contract sub-form
  const [contractAmount, setContractAmount] = useState("");
  const [contractSigned, setContractSigned] = useState(new Date().toISOString().slice(0,10));
  const [toLangSchool, setToLangSchool] = useState(false);
  const [langSchool, setLangSchool] = useState("");

  const [err, setErr] = useState<string | null>(null);

  // PRD联动
  const isExpired = confirmation === "EXPIRED";
  const isTerminal = TERMINAL_STAGES.has(stage);
  const isContract = CONTRACT_STAGES.has(stage);
  const isLost = stage === "输单";
  const showReminderVisitTrial = !isExpired && !isTerminal;

  function submit() {
    setErr(null);
    if (detail.length < 2) return setErr("请填写跟进详情");
    if (isExpired && !expiredReason) return setErr("失效需要填失效原因");
    if (isLost && !lostReason) return setErr("输单需要填输单原因");

    const body: any = {
      advisorConfirmation: confirmation,
      isEffective,
      detail,
      conversionStage: stage,
      visitedOffice: showReminderVisitTrial ? visited : false,
      attendedTrial: showReminderVisitTrial ? trialed : false,
      expiredReason: isExpired ? expiredReason : undefined,
      lostReason: isLost ? lostReason : undefined,
      reminderDays: showReminderVisitTrial && reminderDays ? reminderDays : undefined,
    };
    if (isContract) {
      body.contract = {
        amount: contractAmount ? Number(contractAmount) : undefined,
        signedAt: contractSigned,
        toLanguageSchool: toLangSchool,
        languageSchool: toLangSchool ? langSchool : undefined,
      };
    }
    start(async () => {
      const r = await fetch(`/api/leads/${leadId}/advisor-followups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { setErr(await r.text() || "保存失败"); return; }
      setDetail(""); setReminderDays(null); setVisited(false); setTrialed(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-4 space-y-3">
      <div className="text-sm font-medium text-slate-700">咨询顾问跟进</div>

      {/* 顾问确认 */}
      <div>
        <div className="text-[11px] text-slate-500 mb-1">顾问确认 *</div>
        <div className="flex gap-1.5 flex-wrap">
          {CONFIRMS.map((c) => (
            <button key={c.v} type="button" onClick={() => setConfirmation(c.v)}
                    className={`rounded-full px-3 h-8 text-xs border ${
                      confirmation === c.v ? c.cls : "bg-white text-slate-600 border-slate-200"
                    }`}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* 是否有效跟进 */}
      <label className="text-xs text-slate-600 flex items-center gap-2">
        <input type="checkbox" checked={isEffective} onChange={(e) => setIsEffective(e.target.checked)} />
        本次沟通是否为有效跟进
      </label>

      {/* 跟进详情 */}
      <textarea
        value={detail} onChange={(e) => setDetail(e.target.value)}
        placeholder="顾问跟进详情：聊了什么、判断、下一步…"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[80px] outline-none focus:border-emerald-400"
      />

      {/* 有效资源转化阶段 */}
      {!isExpired && (
        <div>
          <div className="text-[11px] text-slate-500 mb-1">有效资源转化阶段 (单选)</div>
          <div className="flex flex-wrap gap-1.5">
            {CONVERSION_STAGES.map((s) => (
              <button key={s} type="button" onClick={() => setStage(s)}
                      className={`rounded-full px-3 h-8 text-xs border ${
                        stage === s
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* 是否上门/试听/提醒 — only when not terminal AND not expired */}
      {showReminderVisitTrial && (
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs flex items-center gap-1.5">
            <input type="checkbox" checked={visited} onChange={(e) => setVisited(e.target.checked)} />
            是否上门
          </label>
          <label className="text-xs flex items-center gap-1.5">
            <input type="checkbox" checked={trialed} onChange={(e) => setTrialed(e.target.checked)} />
            是否试听
          </label>
          <div className="text-xs flex items-center gap-1.5">
            提醒:
            <input
              type="number" min={0} max={60}
              value={reminderDays ?? ""}
              onChange={(e) => setReminderDays(e.target.value === "" ? null : Number(e.target.value))}
              placeholder="N"
              className="w-16 rounded-lg border border-slate-200 px-2 h-7 text-xs"
            />
            <span>天后</span>
          </div>
        </div>
      )}

      {/* 失效原因 */}
      {isExpired && (
        <div>
          <div className="text-[11px] text-slate-500 mb-1">失效原因 *</div>
          <select value={expiredReason} onChange={(e) => setExpiredReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white">
            <option value="">—</option>
            {EXPIRED_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {/* 输单原因 */}
      {isLost && (
        <div>
          <div className="text-[11px] text-slate-500 mb-1">输单原因 *</div>
          <select value={lostReason} onChange={(e) => setLostReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white">
            <option value="">—</option>
            {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {/* 签约信息 sub-panel */}
      {isContract && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 space-y-2">
          <div className="text-sm font-medium text-emerald-800">
            签约信息 {stage === "老生续费" ? "(老生续费)" : ""}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={contractAmount} onChange={(e) => setContractAmount(e.target.value)}
                   placeholder="金额"
                   className="rounded-lg border border-emerald-200 px-3 h-9 text-sm" />
            <input type="date" value={contractSigned} onChange={(e) => setContractSigned(e.target.value)}
                   className="rounded-lg border border-emerald-200 px-3 h-9 text-sm" />
          </div>
          <div className="text-xs">
            <span className="text-emerald-800">是否转接语校 *</span>
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => setToLangSchool(true)}
                      className={`rounded-full px-3 h-8 text-xs border ${
                        toLangSchool ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200"
                      }`}>是</button>
              <button type="button" onClick={() => setToLangSchool(false)}
                      className={`rounded-full px-3 h-8 text-xs border ${
                        !toLangSchool ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                      }`}>否</button>
            </div>
          </div>
          {toLangSchool && (
            <input value={langSchool} onChange={(e) => setLangSchool(e.target.value)}
                   placeholder="语校去向 (选填)"
                   className="w-full rounded-lg border border-emerald-200 px-3 h-9 text-sm" />
          )}
        </div>
      )}

      {err && <div className="text-xs text-rose-600">{err}</div>}

      <button onClick={submit} disabled={pending}
              className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-sm disabled:opacity-60">
        {pending ? "提交中…" : "提交咨询顾问跟进"}
      </button>
    </div>
  );
}
