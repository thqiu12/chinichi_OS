import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "soft" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  ghost:   "bg-transparent text-slate-700 hover:bg-slate-100",
  soft:    "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-slate-200 text-slate-700 hover:bg-slate-50",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-full",
  md: "h-10 px-4 text-sm rounded-full",
  lg: "h-12 px-6 text-base rounded-full",
};

export function Button({
  className, variant = "primary", size = "md", ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant], sizes[size], className,
      )}
      {...p}
    />
  );
}
