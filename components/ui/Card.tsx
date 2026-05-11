import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-white shadow-card border border-slate-100", className)} {...p} />;
}
export function CardHeader({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5 pb-2 flex items-center justify-between", className)} {...p} />;
}
export function CardTitle({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm font-medium text-slate-700", className)} {...p} />;
}
export function CardContent({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...p} />;
}
