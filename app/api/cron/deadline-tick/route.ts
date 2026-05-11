import { NextResponse } from "next/server";
import { deadlineTick } from "@/services/deadlines";

function authorized(req: Request) {
  const t = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return !process.env.CRON_SECRET || t === process.env.CRON_SECRET;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await deadlineTick();
  return NextResponse.json(r);
}

export async function GET(req: Request) { return POST(req); }
