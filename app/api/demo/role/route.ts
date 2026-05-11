import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const VALID = ["ADMIN","MENTOR","TEACHER","SALES","CAMPUS_HEAD","DIVISION_HEAD"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const as = url.searchParams.get("as") ?? "ADMIN";
  if (!VALID.includes(as)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  const next = url.searchParams.get("next") ?? "/dashboard";
  cookies().set("chinichi_demo_role", as, {
    httpOnly: false, sameSite: "lax", path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.redirect(new URL(next, url.origin));
}
