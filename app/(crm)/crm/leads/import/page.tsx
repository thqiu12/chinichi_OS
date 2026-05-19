import Link from "next/link";
import { ImportClient } from "@/components/crm/ImportClient";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div>
        <Link href="/crm/leads" className="text-sm text-slate-500">← 返回 Leads</Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">批量导入资源</h1>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          支持旧版 CRM 86 列导出 + 0827 新模板 18 列。自动按微信号/手机号查重 —— 重复行会被跳过。
          建议先点 <b>试运行</b> 看报告，确认无误后再 <b>正式导入</b>。
        </p>
      </div>

      <ul className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs text-slate-500 space-y-1">
        <li>· 表头自动按文字匹配（兼容全角字符与"⼿机号"等异体写法）</li>
        <li>· 资源属性/顾问确认/日语基础/语校情况 等枚举值会自动映射</li>
        <li>· 资源来源 一/二/三级 会查字典；未匹配的会塞到 <code>customChannelName</code></li>
        <li>· 跟进、签约 字段会作为快照写入 AdvisorFollowUp / FrontendFollowUp / Contract</li>
        <li>· 跳过/失败的行可下载 CSV 单独处理</li>
      </ul>

      <ImportClient />
    </div>
  );
}
