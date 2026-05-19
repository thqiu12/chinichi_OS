"use client";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

type Row = Record<string, any>;
type PerRow = { row: number; ok: boolean; reason?: string; leadId?: string };

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [aggregate, setAggregate] = useState<{ created: number; skipped: number; failed: number; details: PerRow[] }>({
    created: 0, skipped: 0, failed: 0, details: [],
  });
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(f: File) {
    setErr(null);
    setFile(f);
    setRows([]); setHeaders([]);
    setAggregate({ created: 0, skipped: 0, failed: 0, details: [] });
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
      if (json.length === 0) { setErr("文件没有数据行"); return; }
      setRows(json);
      setHeaders(Object.keys(json[0]));
    } catch (e) {
      setErr(`解析失败: ${(e as Error).message}`);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  async function run(dryRun: boolean) {
    if (rows.length === 0) return;
    setRunning(true);
    setProgress({ done: 0, total: rows.length });
    setAggregate({ created: 0, skipped: 0, failed: 0, details: [] });

    const CHUNK = 50;
    let agg = { created: 0, skipped: 0, failed: 0, details: [] as PerRow[] };
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      try {
        const r = await fetch("/api/leads/import", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk, dryRun, startIndex: i }),
        });
        if (!r.ok) { setErr(await r.text() || "请求失败"); break; }
        const j = await r.json();
        agg.created += j.created;
        agg.skipped += j.skipped;
        agg.failed  += j.failed;
        agg.details = agg.details.concat(j.rows);
        setAggregate({ ...agg });
        setProgress({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
      } catch (e) {
        setErr(`chunk ${i} 失败: ${(e as Error).message}`);
        break;
      }
    }
    setRunning(false);
  }

  function downloadErrorCsv() {
    const errors = aggregate.details.filter((d) => !d.ok);
    if (errors.length === 0) return;
    const lines = ["row,reason", ...errors.map((d) => `${d.row},"${(d.reason ?? "").replace(/"/g, '""')}"`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* DROP ZONE */}
      {!file && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-2xl py-16 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition"
        >
          <div className="text-3xl">📥</div>
          <div className="mt-2 text-sm font-medium text-slate-700">拖拽 .xls / .xlsx 到此处</div>
          <div className="text-xs text-slate-400 mt-1">或点击选择文件 · 支持旧版导出 + 0827 新模板</div>
          <input
            ref={inputRef} type="file" accept=".xls,.xlsx,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />
        </div>
      )}

      {/* FILE INFO */}
      {file && (
        <div className="rounded-2xl bg-white border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{file.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {(file.size / 1024).toFixed(1)} KB · {rows.length} 行 × {headers.length} 列
              </div>
            </div>
            <button
              onClick={() => { setFile(null); setRows([]); setHeaders([]); inputRef.current!.value = ""; }}
              className="text-xs text-slate-500 hover:underline">
              换一个文件
            </button>
          </div>

          {/* Headers preview */}
          {headers.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-1">表头 ({headers.length})</div>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-auto">
                {headers.map((h) => (
                  <span key={h} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* First-row preview */}
          {rows.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-800">
                前 3 行预览
              </summary>
              <div className="mt-2 overflow-auto max-h-60">
                <table className="text-[11px] w-full">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {headers.slice(0, 10).map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {headers.slice(0, 10).map((h) => (
                          <td key={h} className="px-2 py-1 truncate max-w-[140px]">{String(r[h] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {headers.length > 10 && (
                  <div className="text-[10px] text-slate-400 mt-1">… 共 {headers.length} 列，预览前 10 列</div>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      {/* RUN CONTROLS */}
      {file && rows.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => run(true)} disabled={running}
            className="flex-1 rounded-full border border-slate-200 hover:bg-slate-50 py-3 text-sm disabled:opacity-50">
            {running ? "处理中…" : "试运行 (dry-run)"}
          </button>
          <button
            onClick={() => run(false)} disabled={running}
            className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-sm disabled:opacity-60">
            {running ? "导入中…" : "正式导入"}
          </button>
        </div>
      )}

      {/* PROGRESS */}
      {running && (
        <div>
          <div className="text-xs text-slate-500 mb-1">{progress.done} / {progress.total}</div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all"
                 style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* ERROR */}
      {err && <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800">{err}</div>}

      {/* RESULT */}
      {(aggregate.created + aggregate.skipped + aggregate.failed > 0) && (
        <div className="rounded-2xl bg-white border border-slate-100 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="创建" value={aggregate.created} tone="emerald" />
            <Stat label="跳过 (重复)" value={aggregate.skipped} tone="amber" />
            <Stat label="失败" value={aggregate.failed} tone="rose" />
          </div>
          {(aggregate.skipped + aggregate.failed > 0) && (
            <details>
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-800">
                查看明细
              </summary>
              <div className="mt-2 max-h-60 overflow-auto text-xs">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">行</th>
                      <th className="px-2 py-1 text-left font-medium">状态</th>
                      <th className="px-2 py-1 text-left font-medium">原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregate.details.filter((d) => !d.ok).map((d, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-1">{d.row}</td>
                        <td className="px-2 py-1">{d.reason?.startsWith("duplicate") ? "跳过" : "失败"}</td>
                        <td className="px-2 py-1 text-slate-600">{d.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={downloadErrorCsv}
                      className="mt-2 text-xs text-emerald-700 hover:underline">
                ⬇ 下载错误明细 CSV
              </button>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "rose" }) {
  const cls = tone === "emerald" ? "text-emerald-700"
            : tone === "amber"   ? "text-amber-700"
            :                      "text-rose-700";
  return (
    <div className="rounded-xl bg-slate-50 py-3">
      <div className={`text-2xl font-semibold ${cls}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
