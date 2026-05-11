import { NextResponse } from "next/server";
import { getStudentHome } from "@/services/student-home";

export async function GET() {
  return NextResponse.json(await getStudentHome());
}
