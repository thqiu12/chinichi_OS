import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { prisma, safe } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { resourceAttrLabel, conversionStageLabel } from "@/lib/dict";

export const dynamic = "force-dynamic";

export default async function MyCustomersPage() {
  const me = await currentUser();
  const mine = await safe(
    () =>
      prisma.lead.findMany({
        where: me.role === "ADMIN" ? {} : { salesId: me.id },
        orderBy: { updatedAt: "desc" },
        include: { primaryChannel: true },
      }),
    [],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">我的客户</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {me.role === "ADMIN" ? "管理员视图：全部客户" : `${me.name} 名下的客户`}
        </p>
      </header>
      {mine.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 py-12 text-center text-sm text-slate-400">
          名下还没有客户
        </div>
      ) : (
        <ul className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100">
          {mine.map((l) => {
            const attr = resourceAttrLabel(l.resourceAttribute);
            const stage = conversionStageLabel(l.conversionStage);
            return (
              <li key={l.id} className="px-4 py-3 flex justify-between text-sm">
                <div className="min-w-0">
                  <Link href={`/crm/leads/${l.id}`} className="font-medium hover:underline">
                    {l.name}
                  </Link>
                  <div className="text-[11px] text-slate-400">
                    {l.primaryChannel?.name ?? "—"} · {l.degreeType ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={attr.cls}>{attr.label}</Badge>
                  {l.conversionStage && <Badge className={stage.cls}>{stage.label}</Badge>}
                  <span className="text-slate-500">{fmtDate(l.updatedAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
