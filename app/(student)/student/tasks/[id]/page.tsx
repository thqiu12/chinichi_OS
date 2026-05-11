import Link from "next/link";
import { prisma, safe } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const todo = await safe(
    () => prisma.todo.findUnique({ where: { id: params.id } }),
    null,
  );

  if (!todo) {
    return (
      <main className="px-5 pt-8">
        <Link href="/student/tasks" className="text-sm text-slate-500">← 返回</Link>
        <h1 className="text-2xl font-semibold mt-2">任务不存在</h1>
        <p className="text-sm text-slate-500 mt-1">可能已被删除或合并。</p>
      </main>
    );
  }

  return (
    <main className="px-5 pt-8 pb-10">
      <Link href="/student/tasks" className="text-sm text-slate-500">← 返回</Link>
      <h1 className="text-2xl font-semibold mt-2 leading-snug">{todo.title}</h1>
      {todo.dueAt && (
        <p className="text-sm text-slate-500 mt-1">截止 {fmtDate(todo.dueAt)}</p>
      )}

      <div className="mt-6 rounded-2xl bg-white shadow-soft p-4">
        <div className="text-xs text-slate-500 mb-2">提交</div>
        <button
          disabled
          className="w-full rounded-xl border border-dashed border-slate-300 py-8 text-sm text-slate-400"
        >
          点击上传文件 / 图片（MVP 暂用占位）
        </button>
      </div>

      <form action={`/api/student/tasks/${todo.id}/done`} method="post" className="mt-4">
        <button
          type="submit"
          className="w-full rounded-full bg-slate-900 text-white py-3 text-sm font-medium"
        >
          标记完成
        </button>
      </form>
    </main>
  );
}
