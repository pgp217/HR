import { getSql, ensureCandidatesTable } from "@/lib/db";

// 서술형 시나리오 1건의 AI 1차 채점 결과를 candidates.scenario_opinions
// 배열에 추가한다. 동시성이 거의 없는 개인 제출 흐름이라 read-modify-write로
// 충분하다.

interface OpinionBody {
  itemId: string;
  score: number;
  comment: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const db = getSql();
  if (!db) {
    return Response.json({ error: "DATABASE_URL이 설정되어 있지 않습니다." }, { status: 500 });
  }
  const { token } = await params;
  await ensureCandidatesTable(db);

  const rows = await db`SELECT id, scenario_opinions FROM candidates WHERE token = ${token}`;
  if (rows.length === 0) {
    return Response.json({ error: "유효하지 않은 응시 링크입니다." }, { status: 404 });
  }

  const body = (await request.json()) as Partial<OpinionBody>;
  const { itemId, score, comment } = body;
  if (!itemId || typeof score !== "number" || typeof comment !== "string") {
    return Response.json({ error: "itemId, score, comment가 모두 필요합니다." }, { status: 400 });
  }

  const candidateId = rows[0].id as string;
  const existingOpinions = (rows[0].scenario_opinions as { itemId: string }[] | null) ?? [];
  const nextOpinions = [
    ...existingOpinions.filter((o) => o.itemId !== itemId),
    { responseId: candidateId, itemId, score, comment, gradedAt: new Date().toISOString() },
  ];

  await db`UPDATE candidates SET scenario_opinions = ${JSON.stringify(nextOpinions)}::jsonb WHERE token = ${token}`;

  return Response.json({ ok: true });
}
