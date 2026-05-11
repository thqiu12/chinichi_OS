import { NextResponse } from "next/server";
import { findDuplicates } from "@/services/dedupe";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone     = url.searchParams.get("phone")     ?? undefined;
  const wechatId  = url.searchParams.get("wechatId")  ?? undefined;
  const name      = url.searchParams.get("name")      ?? undefined;
  const excludeId = url.searchParams.get("excludeId") ?? undefined;

  const matches = await findDuplicates({ phone, wechatId, name, excludeId });
  return NextResponse.json({ matches });
}
