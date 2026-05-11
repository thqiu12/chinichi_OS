import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="text-center max-w-md">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 mb-5" />
        <h1 className="text-3xl font-semibold tracking-tight">Chinichi · Growth OS</h1>
        <p className="text-slate-500 mt-3 leading-relaxed">
          留学生私塾的陪伴 · 推进 · 不掉队 系统。<br />
          让学生始终知道：<b>今天我该做什么</b>。
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link href="/dashboard"
                className="rounded-2xl bg-slate-900 text-white py-4 text-sm font-medium">
            进入内部端
          </Link>
          <Link href="/student/home"
                className="rounded-2xl bg-white text-slate-900 border border-slate-200 py-4 text-sm font-medium">
            进入学生端
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          MVP · 数据库未连接时也能跑（演示数据）
        </p>
      </div>
    </main>
  );
}
