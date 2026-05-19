import { NextResponse } from "next/server";
import { getMajorTree } from "@/services/dictApi";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tree: await getMajorTree() });
}
