// 면접 평가표 제출 직후 점수-코멘트 불일치를 Claude API로 1차 점검하는
// 라우트. API 키는 process.env.ANTHROPIC_API_KEY(Vercel 환경변수)에서만
// 읽고, 클라이언트로는 절대 내려보내지 않는다. 평가 자체를 막거나 점수를
// 바꾸지 않고, 담당자가 다시 확인해야 할 평가에 표시만 하는 용도다.

interface CheckRequestBody {
  breakdown: Record<string, number>;
  total: number;
  comment: string;
}

interface CheckResult {
  flagged: boolean;
  note: string;
}

function extractJson(text: string): CheckResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj.flagged === "boolean" && typeof obj.note === "string") {
      return { flagged: obj.flagged, note: obj.note };
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

  const body = (await request.json()) as Partial<CheckRequestBody>;
  const { breakdown, total, comment } = body;
  if (!breakdown || typeof total !== "number" || typeof comment !== "string") {
    return Response.json({ error: "breakdown, total, comment가 모두 필요합니다." }, { status: 400 });
  }
  if (comment.trim() === "") {
    return Response.json({ flagged: false, note: "코멘트가 비어 있어 확인할 내용이 없습니다." });
  }

  const systemPrompt =
    "당신은 면접 평가표의 점수와 서술형 코멘트가 서로 맞는지 확인하는 보조자입니다. " +
    "세부 항목 점수(100점 만점)와 평가자가 쓴 코멘트를 보고, 코멘트의 논조가 점수와 눈에 띄게 " +
    "어긋나는지(예: 점수는 높은데 코멘트가 부정적이거나 그 반대) 판단하세요. 평가를 대신 고치거나 " +
    "다시 채점하지 마세요 — 담당자가 다시 봐야 할지만 판단하면 됩니다. " +
    '다른 말 없이 반드시 다음 JSON 형식으로만 답하세요: {"flagged": boolean, "note": string}';

  const userPrompt =
    `[세부 항목 점수]\n${Object.entries(breakdown)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n")}\n\n[종합 점수]\n${total}점 / 100점\n\n[코멘트]\n${comment}`;

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
        max_tokens: 200,
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
  if (!parsed) {
    return Response.json({ error: "점검 결과를 해석할 수 없습니다.", raw: text }, { status: 502 });
  }

  return Response.json(parsed);
}
