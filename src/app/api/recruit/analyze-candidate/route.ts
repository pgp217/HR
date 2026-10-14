// 지원자의 자소서/경력 서술형 답변을 Claude API로 1차 분석하는 라우트. API
// 키는 process.env.ANTHROPIC_API_KEY(Vercel 환경변수)에서만 읽고, 클라이언트로는
// 절대 내려보내지 않는다 — 이 라우트를 거치지 않고는 키에 접근할 방법이 없다.
// 결과는 적합도 점수(computeFitScore)에 반영되지 않는 참고 자료일 뿐이다.

interface AnalyzeRequestBody {
  desiredRole: string;
  mainTasks: string;
  previousExperience: string;
  selfIntroduction: string;
}

interface AnalyzeResult {
  summary: string;
  strengths: string;
  concerns: string;
}

function extractJson(text: string): AnalyzeResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (
      typeof obj.summary === "string" &&
      typeof obj.strengths === "string" &&
      typeof obj.concerns === "string"
    ) {
      return { summary: obj.summary, strengths: obj.strengths, concerns: obj.concerns };
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

  const body = (await request.json()) as Partial<AnalyzeRequestBody>;
  const { desiredRole, mainTasks, previousExperience, selfIntroduction } = body;
  if (!selfIntroduction && !mainTasks && !previousExperience) {
    return Response.json({ error: "분석할 서술형 입력이 없습니다." }, { status: 400 });
  }

  const systemPrompt =
    "당신은 채용 담당자를 돕는 서류 검토 보조자입니다. 지원자가 작성한 자기소개서·경력 서술을 읽고, " +
    "희망 직무와 관련된 경험을 간단히 요약하고, 강점과 추가로 확인이 필요한 부분을 각각 한두 문장으로 " +
    "정리하세요. 당락을 판단하거나 점수를 매기지 마세요 — 최종 판단은 담당자의 몫입니다. " +
    '다른 말 없이 반드시 다음 JSON 형식으로만 답하세요: {"summary": string, "strengths": string, "concerns": string}';

  const userPrompt =
    `[희망 직무]\n${desiredRole || "(미기재)"}\n\n` +
    `[주요 업무 및 성과]\n${mainTasks || "(미기재)"}\n\n` +
    `[이전 경력]\n${previousExperience || "(미기재)"}\n\n` +
    `[자기소개]\n${selfIntroduction || "(미기재)"}`;

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
        max_tokens: 400,
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
    return Response.json({ error: "분석 결과를 해석할 수 없습니다.", raw: text }, { status: 502 });
  }

  return Response.json(parsed);
}
