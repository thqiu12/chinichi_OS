"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, GraduationCap, CalendarRange,
  AlarmClock, MessageCircle, ListTodo, Building2,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",           label: "仪表盘", icon: LayoutDashboard },
  { href: "/students",            label: "学生",   icon: GraduationCap },
  { href: "/lessons/calendar",    label: "课程",   icon: CalendarRange },
  { href: "/deadlines",           label: "Deadline", icon: AlarmClock },
  { href: "/followups/new",       label: "写跟进", icon: MessageCircle },
  { href: "/me/todos",            label: "我的待办", icon: ListTodo },
  { href: "/admin/divisions",     label: "事业部", icon: Building2 },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 border-r border-slate-100 bg-white shrink-0 hidden md:flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600" />
        <div className="font-semibold tracking-tight">Chinichi OS</div>
      </div>
      <nav className="px-2 space-y-0.5">
        {NAV.map((n) => {
          const active = path?.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href} href={n.href}
              className={cn(
                "flex items-center gap-2 px-3 h-9 rounded-lg text-sm",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon size={16} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 py-4 text-xs text-slate-400">
        留学生陪伴 · 推进 · 不掉队
      </div>
    </aside>
  );
}
