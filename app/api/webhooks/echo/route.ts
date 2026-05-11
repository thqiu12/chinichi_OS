import { NextResponse } from "next/server";
import { echoProvider, ingestLearning } from "@/services/learning";

// Body: { studentId: string, data: { date, study_minutes, streak, shadowing_done, ai_conv_count, pron_score } }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.studentId || !body.data) {
      return NextResponse.json({ error: "studentId and data required" }, { status: 400 });
    }
    const r = await ingestLearning(echoProvider, body.data, body.studentId);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
