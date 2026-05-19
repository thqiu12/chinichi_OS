// Vercel Cron triggers GET on this route hourly (see vercel.json).
// Self-hosted setups can hit GET with ?secret=... or POST with x-cron-secret header.
import { NextResponse } from "next/server";
import { deadlineTick } from "@/services/deadlines";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro needed for >10s on Hobby plan

function authorized(req: Request): boolean {
  // Vercel sets this header for /api/cron/* routes referenced in vercel.json
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // open in dev
  const provided =
    req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return provided === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await deadlineTick();
  return NextResponse.json({ ok: true, ...r });
}

export const POST = GET;
