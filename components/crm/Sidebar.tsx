"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Inbox, Kanban, PhoneCall, Trophy, Users, GitMerge } from "lucide-react";

const NAV = [
  { href: "/crm",            label: "首页",      icon: Home, exact: true },
  { href: "/crm/leads",      label: "Leads",     icon: Inbox },
  { href: "/crm/pipeline",   label: "Pipeline",  icon: Kanban },
  { href: "/crm/trials",     label: "试听",      icon: PhoneCall },
  { href: "/crm/won",        label: "成交",      icon: Trophy },
  { href: "/crm/customers",  label: "我的客户",  icon: Users },
  { href: "/crm/dedupe",     label: "查重",      icon: GitMerge },
];

export function CrmSidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 border-r border-slate-100 bg-white shrink-0 hidden md:flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600" />
        <div>
          <div className="font-semibold tracking-tight">Chinichi · CRM</div>
          <div className="text-[11px] text-slate-400 -mt-0.5">Sales workspace</div>
        </div>
      </div>
      <nav className="px-2 space-y-0.5">
        {NAV.map((n) => {
          const active = n.exact ? path === n.href : path?.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href}
                  className={cn(
                    "flex items-center gap-2 px-3 h-9 rounded-lg text-sm",
                    active ? "bg-emerald-600 text-white"
                           : "text-slate-600 hover:bg-slate-100",
                  )}>
              <Icon size={16} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 py-4 text-xs text-slate-400">
        线索 → 试听 → 成交 → 转 Student
      </div>
    </aside>
  );
}
