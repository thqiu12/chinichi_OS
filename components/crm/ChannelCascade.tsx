"use client";
import { useEffect, useState } from "react";
import type { ChannelNode } from "@/services/dictApi";

export function ChannelCascade({
  tree,
  value,
  onChange,
}: {
  tree: ChannelNode[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  // Resolve path from a leaf id (if any)
  const [l1, setL1] = useState<string | null>(null);
  const [l2, setL2] = useState<string | null>(null);
  const [l3, setL3] = useState<string | null>(value);

  useEffect(() => {
    if (!value) { setL1(null); setL2(null); setL3(null); return; }
    for (const a of tree) {
      for (const b of a.children) {
        if (b.id === value) { setL1(a.id); setL2(b.id); setL3(null); return; }
        for (const c of b.children) {
          if (c.id === value) { setL1(a.id); setL2(b.id); setL3(c.id); return; }
        }
      }
      if (a.id === value) { setL1(a.id); setL2(null); setL3(null); return; }
    }
  }, [value, tree]);

  const l1Node = tree.find((n) => n.id === l1);
  const l2Node = l1Node?.children.find((n) => n.id === l2);
  const l3Options = l2Node?.children ?? [];

  function pick(level: 1 | 2 | 3, id: string | null) {
    if (level === 1) {
      setL1(id); setL2(null); setL3(null);
      onChange(id);
    } else if (level === 2) {
      setL2(id); setL3(null);
      onChange(id);
    } else {
      setL3(id);
      onChange(id);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={l1 ?? ""}
        onChange={(e) => pick(1, e.target.value || null)}
        className="rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white"
      >
        <option value="">一级</option>
        {tree.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>

      <select
        value={l2 ?? ""}
        disabled={!l1Node || l1Node.children.length === 0}
        onChange={(e) => pick(2, e.target.value || null)}
        className="rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white disabled:bg-slate-50"
      >
        <option value="">二级</option>
        {l1Node?.children.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>

      <select
        value={l3 ?? ""}
        disabled={!l2Node || l3Options.length === 0}
        onChange={(e) => pick(3, e.target.value || null)}
        className="rounded-xl border border-slate-200 px-3 h-10 text-sm bg-white disabled:bg-slate-50"
      >
        <option value="">三级</option>
        {l3Options.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>
    </div>
  );
}
