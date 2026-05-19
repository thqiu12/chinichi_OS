"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CAMPUSES, REVISIT_DETAILS, INVALID_REASONS } from "@/lib/dict";

export function FrontendFollowUpForm({
  leadId,
  teammates,
  currentOwnerIds,
}: {
  leadId: string;
  teammates: { id: string; name: string; role: string }[];
  currentOwnerIds: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [communicationRef, setCommunicationRef] = useState("");
  const [campus, setCampus] = useState("");
  const [customCampus, setCustomCampus] = useState("");
  const [addedOwnerIds, setAddedOwnerIds] = useState<string[]>([]);
  const [revisitDetail, setRevisitDetail] = useState("");
  const [revisitNote, setRevisitNote] = useState("");
  const [invalidReason, setInvalidReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function toggleOwner(id: string) {
    setAddedOwnerIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  function submit() {
    setErr(null);
    const body: any = {
      communicationRef: communicationRef || undefined,
      assignedCampus: campus === "自定义" ? customCampus : (campus || undefined),
      addedOwnerIds,
      revisitDetail: revisitDetail || undefined,
      revisitNote:  revisitNote || undefined,
      invalidReason: invalidReason || undefined,
    };
    start(async () => {
      const r = await fetch(`/api/leads/${leadId}/frontend-followups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { setErr(await r.text() || "保存失败"); return; }
      setCommunicationRef(""); setRevisitNote(""); setAddedOwnerIds([]);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-4 space-y-3">
      <div className="text-sm font-medium text-slate-700">前端分配跟进</div>

      <div>
        <div className="text-[11px] text-slate-500 mb-1">前端沟通参考</div>
        <textarea value={communicationRef} onChange={(e) => setCommunicationRef(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[64px]"
                  placeholder="此次沟通的关键信息、判断、引导路径…" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] text-slate-500 mb-1">分配校区</div>
          <select value={campus} onChange={(e) => setCampus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white">
            <option value="">—</option>
            {CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {campus === "自定义" && (
            <input value={customCampus} onChange={(e) => setCustomCampus(e.target.value)}
                   placeholder="输入新校区名"
                   className="mt-1 w-full rounded-xl border border-slate-200 px-3 h-9 text-sm" />
          )}
        </div>
        <div>
          <div className="text-[11px] text-slate-500 mb-1">回访详情</div>
          <select value={revisitDetail} onChange={(e) => setRevisitDetail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white">
            <option value="">—</option>
            {REVISIT_DETAILS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="text-[11px] text-slate-500 mb-1">回访备注</div>
        <input value={revisitNote} onChange={(e) => setRevisitNote(e.target.value)}
               className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm" />
      </div>

      <div>
        <div className="text-[11px] text-slate-500 mb-1">添加负责人 (可多选)</div>
        <div className="flex flex-wrap gap-1.5">
          {teammates.map((t) => {
            const already = currentOwnerIds.includes(t.id);
            const picked = addedOwnerIds.includes(t.id);
            return (
              <button key={t.id} type="button" onClick={() => !already && toggleOwner(t.id)}
                      disabled={already}
                      title={already ? "已是负责人" : ""}
                      className={`rounded-full px-3 h-8 text-xs border ${
                        already ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : picked ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200"
                      }`}>
                {t.name}
                <span className="ml-1 opacity-60">{t.role}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-slate-500 mb-1">无效原因 (如果判定无效)</div>
        <select value={invalidReason} onChange={(e) => setInvalidReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white">
          <option value="">—</option>
          {INVALID_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {err && <div className="text-xs text-rose-600">{err}</div>}

      <button onClick={submit} disabled={pending}
              className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm disabled:opacity-60">
        {pending ? "提交中…" : "提交前端跟进"}
      </button>
    </div>
  );
}
