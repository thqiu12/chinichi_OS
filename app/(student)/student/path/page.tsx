import { currentStudent } from "@/lib/auth";
import { stageLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const STAGES = [
  { v: "ONBOARDING",  icon: "🌱" },
  { v: "FOUNDATION",  icon: "🌿" },
  { v: "EXAM_PREP",   icon: "📚" },
  { v: "PORTFOLIO",   icon: "🎨" },
  { v: "APPLICATION", icon: "📨" },
  { v: "INTERVIEW",   icon: "🎤" },
  { v: "ADMITTED",    icon: "🎉" },
] as const;

export default async function StudentPathPage() {
  const s = await currentStudent();
  const currentStage = s?.stage ?? "EXAM_PREP";
  const targetSchool = s?.targetSchool ?? "東京大学 大学院";
  const score = s?.growthScore ?? 62;
  const currentIndex = STAGES.findIndex((x) => x.v === currentStage);

  return (
    <main className="px-5 pt-8 pb-10">
      <h1 className="text-2xl font-semibold tracking-tight">我的升学之路</h1>
      <p className="text-sm text-slate-500 mt-1">目标：{targetSchool}</p>

      <div className="mt-6 rounded-3xl bg-white shadow-soft p-5">
        <div className="text-xs text-slate-500">当前成长进度</div>
        <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
               style={{ width: `${Math.min(100, score)}%` }} />
        </div>
        <div className="mt-2 text-xs text-slate-500">{score}/100</div>
      </div>

      <ol className="mt-6 space-y-3">
        {STAGES.map((st, i) => {
          const done = i < currentIndex;
          const here = i === currentIndex;
          return (
            <li key={st.v}
                className={`relative flex items-center gap-3 rounded-2xl p-4 ${
                  here ? "bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200"
                       : done ? "bg-white border border-slate-100"
                              : "bg-white/60 border border-slate-100"
                }`}>
              <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                done ? "bg-emerald-100" : here ? "bg-brand-200" : "bg-slate-100"
              }`}>{st.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{stageLabel(st.v)}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {done ? "已完成" : here ? "进行中" : "未解锁"}
                </div>
              </div>
              {done && <span className="text-emerald-600 text-sm">✓</span>}
              {here && <span className="text-brand-600 text-xs font-medium">你在这里</span>}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
