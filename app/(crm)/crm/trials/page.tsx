import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TrialsPage() {
  // 试听中: VALID + conversionStage = "试听" (Phase 1 simplification; Phase 4 will
  // use AdvisorFollowUp.attendedTrial=true for richer semantics).
  const trials = await safe(
    () =>
      prisma.lead.findMany({
        where: { resourceAttribute: "VALID", conversionStage: "试听" },
        orderBy: { nextActionDueAt: "asc" },
        include: { primaryChannel: true },
      }),
    [],
  );
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">试听</h1>
      {trials.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 py-12 text-center text-sm text-slate-400">
          暂无试听中的资源
        </div>
      ) : (
        <ul className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100">
          {trials.map((l) => (
            <li key={l.id} className="px-4 py-3 flex justify-between text-sm">
              <Link href={`/crm/leads/${l.id}`}>
                <div className="font-medium hover:underline">{l.name}</div>
                <div className="text-[11px] text-slate-400">
                  {l.primaryChannel?.name ?? "—"} · {l.degreeType ?? "—"}
                </div>
              </Link>
              <div className="text-slate-500">
                {l.nextActionDueAt ? fmtDate(l.nextActionDueAt) : "—"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
