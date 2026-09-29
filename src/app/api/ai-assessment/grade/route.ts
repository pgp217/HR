// 서술형 시나리오 답안을 Claude API로 1차 채점하는 라우트. API 키는
// process.env.ANTHROPIC_API_KEY(Vercel 환경변수)에서만 읽고, 클라이언트로는
// 절대 내려보내지 않는다 — 이 라우트를 거치지 않고는 키에 접근할 방법이 없다.

interface GradeRequestBody {
  prompt: string;
  rubric: string;
  answer: string;
}

interface GradeResult {
  score: number;
  comment: string;
}

function extractJson(text: string): GradeResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj.score === "number" && typeof obj.comment === "string") {
      return { score: obj.score, comment: obj.comment };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY가 설정되어 있지 않습니다. Vercel 환경변수를 확인해주세요." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as Partial<GradeRequestBody>;
  const { prompt, rubric, answer } = body;
  if (!prompt || !rubric || typeof answer !== "string" || answer.trim() === "") {
    return Response.json({ error: "prompt, rubric, answer가 모두 필요합니다." }, { status: 400 });
  }

  const systemPrompt =
    '당신은 사내 AI 역량진단의 서술형 시나리오 문항을 채점하는 평가자입니다. ' +
    "주어진 채점 기준(rubric)에 따라 응답자의 답변을 0~100점 사이로 채점하고, 그 이유를 한국어 한두 문장으로 설명하세요. " +
    '다른 말 없이 반드시 다음 JSON 형식으로만 답하세요: {"score": number, "comment": string}';

  const userPrompt = `[시나리오]\n${prompt}\n\n[채점 기준]\n${rubric}\n\n[응답자 답변]\n${answer}`;

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch {
    return Response.json({ error: "Claude API 호출에 실패했습니다." }, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Claude API 오류 (${res.status}): ${text}` }, { status: 502 });
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const parsed = extractJson(text);
  if (!parsed || parsed.score < 0 || parsed.score > 100) {
    return Response.json({ error: "채점 결과를 해석할 수 없습니다.", raw: text }, { status: 502 });
  }

  return Response.json({ score: Math.round(parsed.score), comment: parsed.comment });
}
