import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSession, setStudentSession } from "@/lib/auth";

const Body = z.object({
  email: z.string().email(),
  password: z.string(),
  as: z.enum(["staff", "student"]).default("staff"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const { email, password, as } = parsed.data;

  if (as === "student") {
    const acc = await prisma.studentAccount.findUnique({ where: { email } });
    if (!acc || !(await bcrypt.compare(password, acc.password))) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }
    await setStudentSession(acc.studentId);
    return NextResponse.json({ ok: true, role: "STUDENT" });
  }

  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.password))) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }
  await setSession(u.id);
  return NextResponse.json({ ok: true, role: u.role });
}
