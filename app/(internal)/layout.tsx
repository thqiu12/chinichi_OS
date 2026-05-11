import { Sidebar } from "@/components/internal/Sidebar";
import { currentUser } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";

export default async function InternalLayout({
  children,
}: { children: React.ReactNode }) {
  const me = await currentUser();
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-slate-100 bg-white px-5 flex items-center justify-between">
          <div className="md:hidden font-semibold">Chinichi OS</div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:block">{me.role}</span>
            <Avatar name={me.name} src={me.avatarUrl ?? undefined} size={28} />
            <span className="text-sm font-medium hidden sm:block">{me.name}</span>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
