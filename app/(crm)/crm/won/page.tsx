import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WonPage() {
  const won = await safe(
    () =>
      prisma.lead.findMany({
        where: { conversionStage: { in: ["已签约", "老生续费"] } },
        orderBy: { updatedAt: "desc" },
        include: { convertedStudent: true, primaryChannel: true },
      }),
    [],
  );
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">成交</h1>
      {won.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 py-12 text-center text-sm text-slate-400">
          还没有成交记录
        </div>
      ) : (
        <ul className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100">
          {won.map((l) => (
            <li key={l.id} className="px-4 py-3 flex justify-between text-sm">
              <div>
                <Link href={`/crm/leads/${l.id}`} className="font-medium hover:underline">
                  {l.name}
                </Link>
                <div className="text-[11px] text-slate-400">
                  {l.conversionStage} · {l.primaryChannel?.name ?? "—"} · 更新于 {fmtDate(l.updatedAt)}
                </div>
              </div>
              {l.convertedStudent && (
                <Link href={`/students/${l.convertedStudent.id}`}
                      className="text-emerald-700 hover:underline">
                  → Student
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
