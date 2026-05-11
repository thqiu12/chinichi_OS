import { NextResponse } from "next/server";

// 企业微信 callback: 加解密细节未实现 (生产前需补 WXBizMsgCrypt)
export async function POST(req: Request) {
  try {
    const text = await req.text();
    console.log("[wecom] raw:", text.slice(0, 200));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// 企业微信首次绑定 URL 验证 (echostr)
export async function GET(req: Request) {
  const echostr = new URL(req.url).searchParams.get("echostr") ?? "";
  return new NextResponse(echostr, { status: 200 });
}
