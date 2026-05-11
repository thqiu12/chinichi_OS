import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="text-center max-w-xl">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 mb-5" />
        <h1 className="text-3xl font-semibold tracking-tight">Chinichi · Growth OS</h1>
        <p className="text-slate-500 mt-3 leading-relaxed">
          留学生私塾的陪伴 · 推进 · 不掉队 系统。<br />
          让学生始终知道：<b>今天我该做什么</b>。
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
        <Card
          href="/api/demo/role?as=ADMIN&next=/dashboard"
          color="from-slate-900 to-slate-700"
          tag="内部端"
          title="班主任 / 教师"
          desc="今天该推进谁、风险中的学生、Deadline、课表、写跟进。"
          cta="进入内部端 →"
        />
        <Card
          href="/api/demo/role?as=SALES&next=/crm"
          color="from-emerald-500 to-emerald-700"
          tag="CRM"
          title="销售"
          desc="Leads · Pipeline · 试听 · 成交。独立产品面，只有销售可访问。"
          cta="进入 CRM →"
        />
        <Card
          href="/student/home"
          color="from-brand-400 to-brand-600"
          tag="学生端"
          title="学生"
          desc="今天最重要的一件事、成长路径、Deadline、老师反馈。"
          cta="进入学生端 →"
        />
      </div>

      <p className="mt-8 text-xs text-slate-400 text-center max-w-md">
        MVP · 三端共用一套数据。<br />
        点上面三张卡会把你切到对应身份（demo cookie）。
      </p>
    </main>
  );
}

function Card({
  href, color, tag, title, desc, cta,
}: {
  href: string; color: string; tag: string; title: string; desc: string; cta: string;
}) {
  return (
    <Link href={href}
          className="group rounded-3xl bg-white border border-slate-100 p-6 shadow-soft hover:shadow-card transition flex flex-col">
      <div className={`inline-block self-start text-[11px] tracking-wide uppercase font-semibold text-white px-2.5 py-1 rounded-full bg-gradient-to-br ${color}`}>
        {tag}
      </div>
      <div className="mt-4 text-lg font-semibold">{title}</div>
      <p className="mt-1 text-sm text-slate-500 leading-relaxed flex-1">{desc}</p>
      <div className="mt-4 text-sm font-medium text-slate-900 group-hover:translate-x-0.5 transition">
        {cta}
      </div>
    </Link>
  );
}
