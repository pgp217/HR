import { getSql, ensureCandidatesTable } from "@/lib/db";

// 지원자가 30문항 응시를 마치고 제출할 때 호출하는 공개 엔드포인트.
// 서술형 시나리오의 AI 채점은 클라이언트가 기존 /api/ai-assessment/grade를
// 그대로 재사용해 문항별로 호출한 뒤, 그 결과를 /opinions로 따로 보낸다
// (내부 직원 응시 흐름과 동일한 패턴).

interface SubmitBody {
  objectiveAnswers: Record<string, number>;
  checklistAnswers: Record<string, number>;
  scenarioAnswers: Record<string, string>;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const db = getSql();
  if (!db) {
    return Response.json({ error: "DATABASE_URL이 설정되어 있지 않습니다." }, { status: 500 });
  }
  const { token } = await params;
  await ensureCandidatesTable(db);

  const existing = await db`SELECT id FROM candidates WHERE token = ${token}`;
  if (existing.length === 0) {
    return Response.json({ error: "유효하지 않은 응시 링크입니다." }, { status: 404 });
  }

  const body = (await request.json()) as Partial<SubmitBody>;
  const { objectiveAnswers, checklistAnswers, scenarioAnswers } = body;
  if (!objectiveAnswers || !checklistAnswers || !scenarioAnswers) {
    return Response.json({ error: "objectiveAnswers, checklistAnswers, scenarioAnswers가 모두 필요합니다." }, { status: 400 });
  }

  await db`
    UPDATE candidates SET
      objective_answers = ${JSON.stringify(objectiveAnswers)}::jsonb,
      checklist_answers = ${JSON.stringify(checklistAnswers)}::jsonb,
      scenario_answers = ${JSON.stringify(scenarioAnswers)}::jsonb,
      scenario_opinions = '[]',
      axis_confirmations = '[]',
      submitted_at = now()
    WHERE token = ${token}
  `;

  return Response.json({ id: existing[0].id });
}
