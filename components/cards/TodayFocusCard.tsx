import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtDate, daysUntil, divisionLabel } from "@/lib/format";

type Item = {
  id: string; name: string; nextAction: string | null;
  nextActionDueAt: Date | null;
  division: { kind: string };
};

export function TodayFocusCard({ items }: { items: Item[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>今天该推进谁</CardTitle>
        <Link href="/followups/new" className="text-xs text-brand-600 hover:underline">
          + 写跟进
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-400">
            今天没有需要立刻推进的学生 👏
          </div>
        )}
        <ul className="space-y-2">
          {items.map((s) => {
            const days = s.nextActionDueAt ? daysUntil(s.nextActionDueAt) : 999;
            const urgency =
              days < 0 ? "bg-rose-50 text-rose-700"
              : days <= 1 ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-600";
            return (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="block rounded-xl border border-slate-100 hover:border-slate-200 p-3 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{s.name}</div>
                    <Badge className={urgency}>
                      {days < 0 ? `逾期 ${-days}d` : days === 0 ? "今天" : `${days}d 内`}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {s.nextAction ?? "（未设置 nextAction，请补充）"}
                  </p>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {divisionLabel(s.division.kind)}
                    {s.nextActionDueAt && <> · {fmtDate(s.nextActionDueAt)}</>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
