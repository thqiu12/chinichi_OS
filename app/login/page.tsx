import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-slate-50">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-card p-7">
        <h1 className="text-xl font-semibold">登录 Chinichi OS</h1>
        <p className="text-sm text-slate-500 mt-1">MVP demo · 直接选择身份进入</p>
        <div className="mt-6 space-y-2">
          <Link href="/dashboard"
                className="block rounded-2xl bg-slate-900 text-white py-3 text-center text-sm font-medium">
            内部端（管理员 / 班主任）
          </Link>
          <Link href="/student/home"
                className="block rounded-2xl bg-brand-50 text-brand-700 py-3 text-center text-sm font-medium">
            学生端
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-6 leading-relaxed">
          已 seed 帐号:<br />
          admin@chinichi.local · mentor@chinichi.local · student@chinichi.local<br />
          密码 admin1234
        </p>
      </div>
    </main>
  );
}
