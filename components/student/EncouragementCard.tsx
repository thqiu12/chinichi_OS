import { Avatar } from "@/components/ui/Avatar";

export function EncouragementCard({
  text,
  mentor,
}: {
  text: string;
  mentor: { name: string; avatarUrl: string | null } | null;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-soft p-4">
      <div className="flex items-center gap-2">
        {mentor && <Avatar name={mentor.name} src={mentor.avatarUrl ?? undefined} size={28} />}
        <div className="text-xs text-slate-500">{mentor?.name ?? "你的班主任"}</div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-800">{text}</p>
    </div>
  );
}
