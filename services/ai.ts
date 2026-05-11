// AIService — works without API key (mock mode). Plug OpenAI by setting OPENAI_API_KEY.
type FbInput = {
  studentName: string;
  subject: string;
  tone: "GREAT" | "OKAY" | "RISK";
  problems: string[];
  nextSteps: string[];
};

const mock = !process.env.OPENAI_API_KEY;

async function chat(systemPrompt: string, userPrompt: string): Promise<string> {
  if (mock) throw new Error("mock");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export async function aiSummarizeFollowUp(content: string): Promise<string> {
  try {
    return (await chat(
      "把跟进记录浓缩成 1 句中文要点，客观、具体，不超过 30 字。",
      content,
    )).trim();
  } catch {
    const t = content.replace(/\s+/g, " ").trim();
    return t.length > 30 ? t.slice(0, 28) + "…" : t;
  }
}

export async function aiGenerateFeedback(input: FbInput): Promise<{ aiBody: string; aiPraise: string | null }> {
  try {
    const text = await chat(
      "你是温暖、专业的留学私塾老师。用 120-180 字中文写一段课后反馈给学生本人，避免客套与说教，语气像私下跟学生说话。",
      `学生: ${input.studentName} / 学科: ${input.subject}
本节状态: ${input.tone}
观察到的问题: ${input.problems.join("、") || "无"}
下一步建议: ${input.nextSteps.join("、") || "继续保持"}
若 tone=GREAT，在末尾另起一行用 ★PRAISE★ 标记一句鼓励。`,
    );
    const [body, praise] = text.split("★PRAISE★").map((s) => s.trim());
    return { aiBody: body, aiPraise: praise || null };
  } catch {
    const opening =
      input.tone === "GREAT" ? "今天的状态很好" :
      input.tone === "OKAY"  ? "今天稳步推进"   :
                               "今天需要把节奏拎起来";
    const issues = input.problems.length ? `观察到：${input.problems.join("、")}。` : "";
    const next   = input.nextSteps.length ? `下一步：${input.nextSteps.join("；")}。` : "";
    return {
      aiBody: `${input.studentName}，${input.subject}课${opening}。${issues}${next}有问题随时找我。`,
      aiPraise: input.tone === "GREAT" ? "你今天特别专注，继续保持节奏，下一节我们再往前推一步。" : null,
    };
  }
}

export async function aiEncouragement(name: string, growthScore: number, lastFeedback?: string): Promise<string> {
  try {
    return (await chat(
      "你是温暖的私塾老师。用 30-50 字给学生今日打气，不要鸡汤、不要客套。",
      `学生: ${name} / 当前成长进度: ${growthScore}/100 / 最近反馈: ${lastFeedback ?? "无"}`,
    )).trim();
  } catch {
    if (growthScore >= 70) return `${name}，节奏稳，今天再做一件具体的事就够了。`;
    if (growthScore >= 40) return `${name}，过去一周你有在前进，今天继续推一点点。`;
    return `${name}，从今天开始，我们一件一件来。`;
  }
}
