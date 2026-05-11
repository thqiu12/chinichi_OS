import Link from "next/link";
import { CrmSidebar } from "@/components/crm/Sidebar";
import { Avatar } from "@/components/ui/Avatar";
import { requireRole } from "@/lib/auth";

export default async function CrmLayout({
  children,
}: { children: React.ReactNode }) {
  const guard = await requireRole(["ADMIN", "SALES"]);

  if (!guard.ok) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-slate-50">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-card p-7 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl">
            🔒
          </div>
          <h1 className="mt-4 text-lg font-semibold">仅销售可访问</h1>
          <p className="text-sm text-slate-500 mt-1">
            CRM 是独立产品面，当前身份是 <b>{guard.me.role}</b>，无权限。
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/dashboard"
                  className="rounded-full bg-slate-900 text-white py-2 text-sm">返回内部端</Link>
            <Link href="/api/demo/role?as=SALES&next=/crm/leads"
                  className="rounded-full bg-emerald-600 text-white py-2 text-sm">以销售身份预览</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex">
      <CrmSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-slate-100 bg-white px-5 flex items-center justify-between">
          <div className="md:hidden font-semibold">Chinichi · CRM</div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
              切到内部端 →
            </Link>
            <span className="text-xs text-slate-500 hidden sm:block">{guard.me.role}</span>
            <Avatar name={guard.me.name} src={guard.me.avatarUrl ?? undefined} size={28} />
            <span className="text-sm font-medium hidden sm:block">{guard.me.name}</span>
          </div>
        </header>
        <main className="flex-1 min-w-0 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
