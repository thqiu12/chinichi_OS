import { NextResponse } from "next/server";
import { getDashboard } from "@/services/dashboard";

export async function GET() {
  const data = await getDashboard();
  return NextResponse.json(data);
}
