import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { importLeads } from "@/services/import";

const Body = z.object({
  rows: z.array(z.record(z.any())),
  dryRun: z.boolean().default(false),
  startIndex: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const me = await currentUser();
  if (!["ADMIN","HEAD","CHANNEL","MARKETING","SALES"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.format(), { status: 400 });

  const result = await importLeads(parsed.data.rows, {
    authorId: me.id === "demo" ? null : me.id,
    dryRun: parsed.data.dryRun,
    startIndex: parsed.data.startIndex,
  });
  return NextResponse.json(result);
}

// Body-size note: Next defaults to 1MB. With 100-row chunks of ~3KB each = ~300KB.
// If you need to bump, see next.config.mjs experimental.serverActions.bodySizeLimit.
