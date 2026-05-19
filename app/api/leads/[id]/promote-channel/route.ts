// PRD 0723 §7: 带有多个重复渠道信息的资源，下方设置一个【设为首选】按钮，
// 可移交渠道归属（所有渠道信息仍保留，列表表头以新首选渠道为准）。
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const Body = z.object({
  channelId: z.string(), // the secondary channel to promote (must already be in secondaryChannelIds)
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!["ADMIN","SALES","CHANNEL","MARKETING","HEAD"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }
  const { channelId } = parsed.data;

  try {
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: params.id } });
    if (!lead.secondaryChannelIds.includes(channelId)) {
      return NextResponse.json({ error: "channelId is not in secondaryChannelIds" }, { status: 400 });
    }
    const newSecondary = lead.secondaryChannelIds.filter((id) => id !== channelId);
    if (lead.primaryChannelId) newSecondary.push(lead.primaryChannelId);

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: {
        primaryChannelId: channelId,
        secondaryChannelIds: newSecondary,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
