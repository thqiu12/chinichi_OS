// 企业微信 service. Mock-safe: no creds → no-op (still records Notification row).
import { prisma, safe } from "@/lib/db";

const BASE = "https://qyapi.weixin.qq.com/cgi-bin";
let cache: { token: string; exp: number } | null = null;

async function token(): Promise<string | null> {
  if (!process.env.WECOM_CORP_ID || !process.env.WECOM_SECRET) return null;
  if (cache && cache.exp > Date.now()) return cache.token;
  const r = await fetch(
    `${BASE}/gettoken?corpid=${process.env.WECOM_CORP_ID}&corpsecret=${process.env.WECOM_SECRET}`,
  );
  const j = await r.json();
  if (!j.access_token) return null;
  cache = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return cache.token;
}

export async function sendWeCom(
  toUser: string | undefined | null,
  content: string,
  meta?: { studentId?: string; userId?: string; link?: string; title?: string },
): Promise<void> {
  // Always record the notification, even if WeCom isn't configured
  await safe(
    () =>
      prisma.notification.create({
        data: {
          toUserId: meta?.userId,
          toStudentId: meta?.studentId,
          channel: toUser ? "wecom" : "inapp",
          title: meta?.title ?? "提醒",
          body: content,
          link: meta?.link,
          sentAt: toUser ? new Date() : null,
        },
      }),
    null,
  );

  const t = await token();
  if (!t || !toUser) return; // mock mode

  await fetch(`${BASE}/message/send?access_token=${t}`, {
    method: "POST",
    body: JSON.stringify({
      touser: toUser,
      msgtype: "text",
      agentid: process.env.WECOM_AGENT_ID,
      text: { content },
    }),
  }).catch(() => {});
}

export async function listWeComUsers(deptId = 1) {
  const t = await token();
  if (!t) return [];
  const r = await fetch(
    `${BASE}/user/list?access_token=${t}&department_id=${deptId}&fetch_child=1`,
  );
  return ((await r.json()).userlist ?? []) as Array<{
    userid: string; name: string; mobile?: string;
  }>;
}
