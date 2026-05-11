import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, Dot } from "@/components/ui/Badge";
import { riskLabel, divisionLabel, fmtDate } from "@/lib/format";

type Item = {
  id: string; name: string; riskLevel: string; lastFollowUpAt: Date | null;
  division: { kind: string };
};

export function RiskCard({ items }: { items: Item[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>风险中的学生</CardTitle>
        <Link href="/students?risk=YELLOW,RED" className="text-xs text-slate-500 hover:underline">
          全部 →
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 && <Empty>没有风险学生 ✨</Empty>}
        <ul className="divide-y divide-slate-100">
          {items.map((s) => {
            const r = riskLabel(s.riskLevel);
            return (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Dot className={r.dot} />
                    <span className="font-medium text-sm truncate">{s.name}</span>
                    <span className="text-xs text-slate-400">{divisionLabel(s.division.kind)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={r.cls}>{r.label}</Badge>
                    <span className="text-xs text-slate-400">
                      {s.lastFollowUpAt ? `${fmtDate(s.lastFollowUpAt)} 跟进` : "未跟进"}
                    </span>
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

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-sm text-slate-400">{children}</div>;
}
