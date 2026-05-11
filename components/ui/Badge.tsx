import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className, ...p
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-slate-100 text-slate-700",
        className,
      )}
      {...p}
    />
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block w-1.5 h-1.5 rounded-full", className)} />;
}
