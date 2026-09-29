import { getSql, ensureCandidatesTable } from "@/lib/db";

// 지원자가 이메일로 받은 링크(/apply/[token])에서 자기 이름을 확인하고,
// 이미 제출했는지 알기 위해 호출하는 공개 엔드포인트. 토큰 자체가 비밀값이라
// 별도 로그인 없이도 본인 확인이 된다.

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const db = getSql();
  if (!db) {
    return Response.json({ error: "DATABASE_URL이 설정되어 있지 않습니다." }, { status: 500 });
  }
  const { token } = await params;
  await ensureCandidatesTable(db);
  const rows = await db`SELECT name, submitted_at FROM candidates WHERE token = ${token}`;
  if (rows.length === 0) {
    return Response.json({ error: "유효하지 않은 응시 링크입니다." }, { status: 404 });
  }
  return Response.json({ name: rows[0].name, submitted: rows[0].submitted_at != null });
}
