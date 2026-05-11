import { MobileNav } from "@/components/student/MobileNav";

export default function StudentLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white">
      <div className="max-w-md mx-auto pb-20">{children}</div>
      <MobileNav />
    </div>
  );
}
