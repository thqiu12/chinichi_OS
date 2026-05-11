import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { daysUntil, fmtDate } from "@/lib/format";

type Item = {
  id: string; title: string; dueAt: Date;
  student: { id: string; name: string };
};

export function DeadlineCard({ items }: { items: Item[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>本周 Deadline</CardTitle>
        <Link href="/deadlines" className="text-xs text-slate-500 hover:underline">
          全部 →
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-400">本周暂无 Deadline</div>
        )}
        <ul className="space-y-2">
          {items.map((d) => {
            const left = daysUntil(d.dueAt);
            const cls =
              left <= 1 ? "bg-rose-50 text-rose-700" :
              left <= 3 ? "bg-amber-50 text-amber-700" :
                          "bg-slate-100 text-slate-600";
            return (
              <li key={d.id}>
                <Link
                  href={`/students/${d.student.id}?tab=deadlines`}
                  className="flex items-center justify-between text-sm py-1.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-xs text-slate-400">
                      {d.student.name} · {fmtDate(d.dueAt)}
                    </div>
                  </div>
                  <Badge className={cls}>{left <= 0 ? "今天" : `${left} 天`}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
