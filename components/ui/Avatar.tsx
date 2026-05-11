import { cn } from "@/lib/utils";

export function Avatar({
  name, src, size = 36, className,
}: { name: string; src?: string | null; size?: number; className?: string }) {
  const initial = name.trim().slice(0, 1);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-medium",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
