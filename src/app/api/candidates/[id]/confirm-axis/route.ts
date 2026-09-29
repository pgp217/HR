import { getSql, ensureCandidatesTable } from "@/lib/db";

// 진단 관리(외부 지원자) 화면에서 인사담당자가 축 점수를 확정할 때 호출.
// 내부 직원 진단의 AxisConfirmation과 같은 모양으로 저장해 scoreResponse()를
// 그대로 재사용할 수 있게 한다.

interface ConfirmBody {
  axis: string;
  confirmedScore: number;
  comment?: string;
  confirmedBy: string;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getSql();
  if (!db) {
    return Response.json({ error: "DATABASE_URL이 설정되어 있지 않습니다." }, { status: 500 });
  }
  const { id } = await params;
  await ensureCandidatesTable(db);

  const rows = await db`SELECT axis_confirmations FROM candidates WHERE id = ${id}`;
  if (rows.length === 0) {
    return Response.json({ error: "지원자를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await request.json()) as Partial<ConfirmBody>;
  const { axis, confirmedScore, comment, confirmedBy } = body;
  if (!axis || typeof confirmedScore !== "number" || typeof confirmedBy !== "string") {
    return Response.json({ error: "axis, confirmedScore, confirmedBy가 모두 필요합니다." }, { status: 400 });
  }

  const existing = (rows[0].axis_confirmations as { axis: string }[] | null) ?? [];
  const next = [
    ...existing.filter((c) => c.axis !== axis),
    { responseId: id, axis, confirmedScore, comment, confirmedBy, confirmedAt: new Date().toISOString() },
  ];

  await db`UPDATE candidates SET axis_confirmations = ${JSON.stringify(next)}::jsonb WHERE id = ${id}`;

  return Response.json({ ok: true });
}
