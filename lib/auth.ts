// MVP-grade auth: cookie-stored userId. Replace with NextAuth before prod.
import { cookies } from "next/headers";
import { prisma, safe } from "./db";

const COOKIE = "chinichi_uid";
const STUDENT_COOKIE = "chinichi_sid";

export async function setSession(userId: string) {
  cookies().set(COOKIE, userId, {
    httpOnly: true, sameSite: "lax", path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function setStudentSession(studentId: string) {
  cookies().set(STUDENT_COOKIE, studentId, {
    httpOnly: true, sameSite: "lax", path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  cookies().delete(COOKIE);
  cookies().delete(STUDENT_COOKIE);
}

export type Me = {
  id: string; name: string; email: string;
  role: string; avatarUrl: string | null;
};

export async function currentUser(): Promise<Me> {
  const id = cookies().get(COOKIE)?.value;
  if (id) {
    const u = await safe(
      () => prisma.user.findUnique({ where: { id } }),
      null,
    );
    if (u) return { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl };
  }
  // Demo fallback so the UI never breaks while you're setting things up
  return { id: "demo", name: "Demo Mentor", email: "demo@chinichi.local",
           role: "MENTOR", avatarUrl: null };
}

export async function currentStudent() {
  const id = cookies().get(STUDENT_COOKIE)?.value;
  if (id) {
    const s = await safe(
      () => prisma.student.findUnique({
        where: { id },
        include: { mentor: true, division: true },
      }),
      null,
    );
    if (s) return s;
  }
  return null;
}
