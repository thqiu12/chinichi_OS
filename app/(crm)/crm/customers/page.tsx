import { currentUser } from "@/lib/auth";
import { prisma, safe } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NEW: "新", CONTACTED: "已联系", TRIAL: "试听",
  NEGOTIATING: "意向", WON: "成交", LOST: "流失",
};

export default async function MyCustomersPage() {
  const me = await currentUser();
  const mine = await safe(
    () =>
      prisma.lead.findMany({
        where: me.role === "ADMIN" ? {} : { salesId: me.id },
        orderBy: { updatedAt: "desc" },
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
          {mine.map((l) => (
            <li key={l.id} className="px-4 py-3 flex justify-between text-sm">
              <div>
                <div className="font-medium">{l.name}</div>
                <div className="text-[11px] text-slate-400">{l.phone ?? "—"} · {l.targetDegree ?? "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{STATUS_LABEL[l.status]}</Badge>
                <span className="text-slate-500">{fmtDate(l.updatedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
