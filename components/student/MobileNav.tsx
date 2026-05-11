"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, ListChecks, AlarmClock, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/student/home",      label: "首页",  icon: Home },
  { href: "/student/path",      label: "路径",  icon: Map },
  { href: "/student/tasks",     label: "任务",  icon: ListChecks },
  { href: "/student/deadlines", label: "Deadline", icon: AlarmClock },
  { href: "/student/schedule",  label: "课程",  icon: CalendarDays },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-100 z-30">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {NAV.map((n) => {
          const active = path?.startsWith(n.href);
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px]",
                  active ? "text-brand-600" : "text-slate-500",
                )}
              >
                <Icon size={18} />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
