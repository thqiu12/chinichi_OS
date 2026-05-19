"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChannelNode, MajorNode, SchoolTierGroup } from "@/services/dictApi";
import { ChannelCascade } from "./ChannelCascade";
import {
  DEGREE_TYPES, SUBJECT_AREAS, ENGLISH_LEVELS, INVALID_REASONS,
  GRADES, JAPAN_STATUS_OPTIONS,
} from "@/lib/dict";

const ATTRS = [
  { v: "PENDING", label: "待判定", hint: "不展开核心属性" },
  { v: "VALID",   label: "有效",   hint: "需要补全核心属性" },
  { v: "INVALID", label: "无效",   hint: "核心属性选填，下方写无效原因" },
  { v: "EXPIRED", label: "失效",   hint: "由跟进决定，一般不在此手动选" },
] as const;
type Attr = typeof ATTRS[number]["v"];

const IDENTITIES = [
  { v: "STUDENT", label: "学生" },
  { v: "PARENT",  label: "家长" },
  { v: "KIN",     label: "其他亲友" },
] as const;

const JLPT_LEVELS = [
  { v: "N1",          label: "N1" },
  { v: "N2",          label: "N2" },
  { v: "N3_N4",       label: "N3/N4" },
  { v: "N5_OR_BELOW", label: "N5及以下（含0基础）" },
  { v: "STUDYING",    label: "学习中尚未考证" },
  { v: "UNKNOWN",     label: "暂未知" },
] as const;

const LANG_SCHOOL_OPTIONS = [
  { v: "NOT_APPLIED",     label: "尚未申请语校" },
  { v: "NO_NEED",         label: "无语校需求" },
  { v: "ENROLLED",        label: "已在语校就读" },
  { v: "APPLIED_WAITING", label: "已申请语校还未入学" },
  { v: "UNKNOWN",         label: "暂未知" },
] as const;

export type LeadFormInitial = {
  id?: string;
  name?: string;
  phone?: string | null;
  phoneAux1?: string | null;
  phoneAux2?: string | null;
  wechatId?: string | null;
  wechatAux1?: string | null;
  wechatAux2?: string | null;
  notes?: string | null;

  resourceAttribute?: Attr;
  invalidReason?: string | null;

  primaryChannelId?: string | null;
  channelLocation?: string | null;
  sourceDetail?: string | null;
  sourceCampus?: string | null;
  customChannelName?: string | null;

  degreeType?: string | null;
  subjectArea?: string | null;
  targetMajorId?: string | null;
  specificDirection?: string | null;
  currentSchool?: string | null;
  currentMajor?: string | null;
  isMajorAligned?: boolean | null;
  schoolTierId?: string | null;
  grade?: string | null;
  graduationYear?: number | null;
  province?: string | null;
  city?: string | null;
  identityKind?: "STUDENT" | "PARENT" | "KIN" | null;
  jlpt?: string | null;
  englishLevel?: string | null;
  japanStatus?: string | null;
  langSchoolStatus?: string | null;
  langSchoolEnrollMonth?: string | null;

  conversionProbability?: number;
  nextAction?: string | null;
  nextActionDueAt?: Date | string | null;
};

export function LeadForm({
  mode,
  initial = {},
  channelTree,
  majorTree,
  schoolTiers,
  forced = false,
  canEditChannelLocation = false,
}: {
  mode: "create" | "edit";
  initial?: LeadFormInitial;
  channelTree: ChannelNode[];
  majorTree: MajorNode[];
  schoolTiers: SchoolTierGroup[];
  forced?: boolean;
  canEditChannelLocation?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // ── Panel A — 核心信息 ──
  const [name, setName] = useState(initial.name ?? "");
  const [wechatId, setWechatId] = useState(initial.wechatId ?? "");
  const [wechatAux1, setWechatAux1] = useState(initial.wechatAux1 ?? "");
  const [wechatAux2, setWechatAux2] = useState(initial.wechatAux2 ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [phoneAux1, setPhoneAux1] = useState(initial.phoneAux1 ?? "");
  const [phoneAux2, setPhoneAux2] = useState(initial.phoneAux2 ?? "");
  const [attr, setAttr] = useState<Attr>((initial.resourceAttribute as Attr) ?? "PENDING");
  const [invalidReason, setInvalidReason] = useState(initial.invalidReason ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");

  // ── Panel B — 渠道信息 ──
  const [primaryChannelId, setPrimaryChannelId] = useState<string | null>(initial.primaryChannelId ?? null);
  const [channelLocation, setChannelLocation] = useState(initial.channelLocation ?? "");
  const [sourceDetail, setSourceDetail] = useState(initial.sourceDetail ?? "");
  const [sourceCampus, setSourceCampus] = useState(initial.sourceCampus ?? "");
  const [customChannelName, setCustomChannelName] = useState(initial.customChannelName ?? "");

  // ── Panel C — 资源核心属性 ──
  const [degreeType, setDegreeType] = useState(initial.degreeType ?? "");
  const [subjectArea, setSubjectArea] = useState(initial.subjectArea ?? "");
  const [majorL1, setMajorL1] = useState<string | null>(null);
  const [targetMajorId, setTargetMajorId] = useState<string | null>(initial.targetMajorId ?? null);
  const [specificDirection, setSpecificDirection] = useState(initial.specificDirection ?? "");
  const [currentSchool, setCurrentSchool] = useState(initial.currentSchool ?? "");
  const [schoolTierId, setSchoolTierId] = useState<string | null>(initial.schoolTierId ?? null);
  const [currentMajor, setCurrentMajor] = useState(initial.currentMajor ?? "");
  const [isMajorAligned, setIsMajorAligned] = useState<boolean | null>(initial.isMajorAligned ?? null);
  const [grade, setGrade] = useState(initial.grade ?? "");
  const [graduationYear, setGraduationYear] = useState<string>(initial.graduationYear ? String(initial.graduationYear) : "");
  const [province, setProvince] = useState(initial.province ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [identityKind, setIdentityKind] = useState<string>(initial.identityKind ?? "STUDENT");
  const [jlpt, setJlpt] = useState(initial.jlpt ?? "");
  const [englishLevel, setEnglishLevel] = useState(initial.englishLevel ?? "");
  const [japanStatus, setJapanStatus] = useState(initial.japanStatus ?? "");
  const [langSchoolStatus, setLangSchoolStatus] = useState(initial.langSchoolStatus ?? "");
  const [langSchoolEnrollMonth, setLangSchoolEnrollMonth] = useState(initial.langSchoolEnrollMonth ?? "");

  // Find l1 of selected majorId
  const targetMajorL2 = majorTree.flatMap((g) => g.children).find((m) => m.id === targetMajorId);
  const actualMajorL1 = majorL1 ?? majorTree.find((g) => g.children.some((m) => m.id === targetMajorId))?.id ?? null;
  const majorL2Options = majorTree.find((g) => g.id === actualMajorL1)?.children ?? [];

  // Schoolt tier category
  const [tierCategory, setTierCategory] = useState<string>("ARTS_SCIENCES");
  const tierGroups = schoolTiers.find((g) => g.category === tierCategory)?.groups ?? [];

  // 联动: PENDING hides Panel C; INVALID makes Panel C non-required + shows Panel D inline.
  const showCore = attr !== "PENDING";
  const coreRequired = attr === "VALID";
  const showInvalidReason = attr === "INVALID";

  function build() {
    const payload: any = {
      name, phone, wechatId,
      phoneAux1, phoneAux2, wechatAux1, wechatAux2,
      resourceAttribute: attr, notes,
      primaryChannelId, channelLocation: channelLocation || undefined, sourceDetail, sourceCampus, customChannelName,
      ...(forced ? { force: true } : {}),
    };
    if (showInvalidReason) payload.invalidReason = invalidReason || undefined;
    if (showCore) {
      Object.assign(payload, {
        degreeType: degreeType || undefined,
        subjectArea: subjectArea || undefined,
        targetMajorId: targetMajorId || undefined,
        specificDirection: specificDirection || undefined,
        currentSchool: currentSchool || undefined,
        currentMajor: currentMajor || undefined,
        isMajorAligned: isMajorAligned ?? undefined,
        schoolTierId: schoolTierId || undefined,
        grade: grade || undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        province: province || undefined,
        city: city || undefined,
        identityKind: identityKind || undefined,
        jlpt: jlpt || undefined,
        englishLevel: englishLevel || undefined,
        japanStatus: japanStatus || undefined,
        langSchoolStatus: langSchoolStatus || undefined,
        langSchoolEnrollMonth: langSchoolEnrollMonth || undefined,
      });
    }
    return payload;
  }

  function submit() {
    setErr(null);
    if (!name) return setErr("姓名必填");
    if (!wechatId && !phone) return setErr("至少填写一个微信号或手机号");
    if (coreRequired) {
      if (!degreeType) return setErr("有效资源必须选择升学类型");
      if (!subjectArea) return setErr("有效资源必须选择学科属性");
    }
    if (showInvalidReason && !invalidReason) return setErr("无效资源必须填无效原因");

    start(async () => {
      const url = mode === "create" ? "/api/leads" : `/api/leads/${initial.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(build()),
      });
      if (res.status === 409) {
        setErr("服务端查重检测到重复客户。请回到查重闸门确认。");
        return;
      }
      if (!res.ok) {
        setErr(await res.text() || "保存失败");
        return;
      }
      const lead = await res.json();
      router.push(`/crm/leads/${lead.id ?? initial.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {forced && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
          ⚠ 你已确认要新建一个与现有客户相似的 lead。
        </div>
      )}

      {/* PANEL A — 核心信息 */}
      <Panel title="① 核心信息" subtitle="必填">
        <Row>
          <Field label="姓名 *">
            <Input value={name} onChange={setName} placeholder="周晓雯" />
          </Field>
          <Field label="资源属性 *" hint={ATTRS.find((a) => a.v === attr)?.hint}>
            <div className="flex flex-wrap gap-1.5">
              {ATTRS.map((a) => (
                <button key={a.v} type="button" onClick={() => setAttr(a.v)}
                        className={`rounded-full px-3 h-8 text-xs border transition ${
                          attr === a.v
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}>{a.label}</button>
              ))}
            </div>
          </Field>
        </Row>
        <Row>
          <Field label="主微信号 *"  hint="一人一号，查重最准">
            <Input value={wechatId} onChange={setWechatId} placeholder="zhouxw" emphasized />
          </Field>
          <Field label="主手机号">
            <Input value={phone} onChange={setPhone} placeholder="138 0000 0000" />
          </Field>
        </Row>
        <Row>
          <Field label="辅助微信号 1"><Input value={wechatAux1} onChange={setWechatAux1} /></Field>
          <Field label="辅助手机号 1"><Input value={phoneAux1} onChange={setPhoneAux1} /></Field>
        </Row>
        <Row>
          <Field label="辅助微信号 2"><Input value={wechatAux2} onChange={setWechatAux2} /></Field>
          <Field label="辅助手机号 2" hint="例如:辅助微信号1为学生妈妈的联系方式">
            <Input value={phoneAux2} onChange={setPhoneAux2} />
          </Field>
        </Row>
        <Field label="其他备注">
          <TextArea value={notes} onChange={setNotes} />
        </Field>

        {showInvalidReason && (
          <Field label="无效原因 *">
            <select value={invalidReason} onChange={(e) => setInvalidReason(e.target.value)} className="input">
              <option value="">— 选择 —</option>
              {INVALID_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        )}
      </Panel>

      {/* PANEL B — 渠道信息 */}
      <Panel title="② 渠道信息" subtitle="资源来源 (一/二/三级) + 来源详情">
        <Field label="资源来源 *">
          <ChannelCascade tree={channelTree} value={primaryChannelId} onChange={setPrimaryChannelId} />
        </Field>
        <Row>
          {canEditChannelLocation ? (
            <Field label="渠道所在地" hint="仅渠道部填写">
              <Input value={channelLocation} onChange={setChannelLocation} />
            </Field>
          ) : <div /> }
          <Field label="来源所属校区">
            <Input value={sourceCampus} onChange={setSourceCampus} />
          </Field>
        </Row>
        <Field label="来源详情" hint="文章/笔记/推荐人等">
          <Input value={sourceDetail} onChange={setSourceDetail} />
        </Field>
        <Field label="新增渠道名"
               hint="仅用于填写新增的渠道名或新设的账号名 (PRD 0827 §1)">
          <Input value={customChannelName} onChange={setCustomChannelName} />
        </Field>
      </Panel>

      {/* PANEL C — 资源核心属性 */}
      {showCore && (
        <Panel title="③ 资源核心属性"
               subtitle={coreRequired ? "有效资源必填项" : "无效资源全部选填"}>
          <Row>
            <Field label={coreRequired ? "升学类型 *" : "升学类型"}>
              <select value={degreeType} onChange={(e) => setDegreeType(e.target.value)} className="input">
                <option value="">—</option>
                {DEGREE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label={coreRequired ? "学科属性 *" : "学科属性"}>
              <select value={subjectArea} onChange={(e) => setSubjectArea(e.target.value)} className="input">
                <option value="">—</option>
                {SUBJECT_AREAS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="目标专业 (一级 → 二级)">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={actualMajorL1 ?? ""}
                onChange={(e) => { setMajorL1(e.target.value || null); setTargetMajorId(null); }}
                className="input"
              >
                <option value="">一级学科</option>
                {majorTree.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select
                value={targetMajorId ?? ""}
                onChange={(e) => setTargetMajorId(e.target.value || null)}
                disabled={majorL2Options.length === 0}
                className="input disabled:bg-slate-50"
              >
                <option value="">对应专业</option>
                {majorL2Options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </Field>

          <Field label="具体方向">
            <Input value={specificDirection} onChange={setSpecificDirection} />
          </Field>

          <Row>
            <Field label="目前就读院校">
              <Input value={currentSchool} onChange={setCurrentSchool} placeholder="自定义填写院校名称" />
            </Field>
            <Field label="院校层次">
              <div className="grid grid-cols-2 gap-2">
                <select value={tierCategory} onChange={(e) => setTierCategory(e.target.value)} className="input">
                  {schoolTiers.map((g) => <option key={g.category} value={g.category}>{g.label}</option>)}
                </select>
                <select value={schoolTierId ?? ""} onChange={(e) => setSchoolTierId(e.target.value || null)} className="input">
                  <option value="">—</option>
                  {tierGroups.flatMap((sg) => sg.tiers).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </Field>
          </Row>

          <Row>
            <Field label="目前就读专业">
              <Input value={currentMajor} onChange={setCurrentMajor} />
            </Field>
            <Field label="是否与升学方向专业对口">
              <div className="flex gap-2 mt-1">
                {[
                  { v: "yes",  label: "对口" },
                  { v: "no",   label: "不对口" },
                  { v: "none", label: "—" },
                ].map((o) => (
                  <button key={o.v} type="button"
                          onClick={() => setIsMajorAligned(o.v === "yes" ? true : o.v === "no" ? false : null)}
                          className={`rounded-full px-3 h-8 text-xs border ${
                            (isMajorAligned === true && o.v === "yes") ||
                            (isMajorAligned === false && o.v === "no") ||
                            (isMajorAligned === null && o.v === "none")
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}>{o.label}</button>
                ))}
              </div>
            </Field>
          </Row>

          <Row>
            <Field label="年级">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input">
                <option value="">—</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="毕业时间 (年)">
              <Input value={graduationYear} onChange={setGraduationYear} placeholder="2026" />
            </Field>
          </Row>

          <Row>
            <Field label="学生所在省">
              <Input value={province} onChange={setProvince} placeholder="四川" />
            </Field>
            <Field label="所在市">
              <Input value={city} onChange={setCity} placeholder="成都" />
            </Field>
          </Row>

          <Row>
            <Field label="身份">
              <div className="flex gap-2">
                {IDENTITIES.map((i) => (
                  <button key={i.v} type="button" onClick={() => setIdentityKind(i.v)}
                          className={`rounded-full px-3 h-8 text-xs border ${
                            identityKind === i.v
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}>{i.label}</button>
                ))}
              </div>
            </Field>
            <Field label="日语基础">
              <select value={jlpt} onChange={(e) => setJlpt(e.target.value)} className="input">
                <option value="">—</option>
                {JLPT_LEVELS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="英语基础">
              <select value={englishLevel} onChange={(e) => setEnglishLevel(e.target.value)} className="input">
                <option value="">—</option>
                {ENGLISH_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="赴日情况">
              <select value={japanStatus} onChange={(e) => setJapanStatus(e.target.value)} className="input">
                <option value="">—</option>
                {JAPAN_STATUS_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="语校情况">
            <select value={langSchoolStatus} onChange={(e) => setLangSchoolStatus(e.target.value)} className="input">
              <option value="">—</option>
              {LANG_SCHOOL_OPTIONS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
            </select>
            {langSchoolStatus === "APPLIED_WAITING" && (
              <Input
                value={langSchoolEnrollMonth} onChange={setLangSchoolEnrollMonth}
                placeholder="语校入学时间 YYYY-MM"
                className="mt-2"
              />
            )}
          </Field>
        </Panel>
      )}

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={pending}
                className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-sm font-medium disabled:opacity-60">
          {pending ? "保存中…" : mode === "create" ? "新建资源" : "保存修改"}
        </button>
      </div>

      <style>{`
        .input {
          width: 100%; border-radius: 12px;
          border: 1px solid rgb(226 232 240);
          padding: 0 12px; height: 40px; font-size: 14px; background: white;
        }
        textarea.input { height: auto; padding: 10px 12px; min-height: 80px; }
        .input-emphasized { border-color: rgb(16 185 129); box-shadow: 0 0 0 3px rgb(209 250 229); }
      `}</style>
    </div>
  );
}

// ── Helper components ──
function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-100 p-5">
      <header className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-[11px] text-slate-400">{subtitle}</div>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-600">{label}</label>
      {hint && <div className="text-[10.5px] text-slate-400 mt-0.5">{hint}</div>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Input({
  value, onChange, placeholder, emphasized, className,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; emphasized?: boolean; className?: string;
}) {
  return (
    <input
      value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`input ${emphasized ? "input-emphasized" : ""} ${className ?? ""}`}
    />
  );
}

function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} className="input" rows={3} />
  );
}
