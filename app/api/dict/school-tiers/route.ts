import { NextResponse } from "next/server";
import { getSchoolTiers } from "@/services/dictApi";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ groups: await getSchoolTiers() });
}
