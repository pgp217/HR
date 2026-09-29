import { randomUUID } from "crypto";
import { getSql, ensureCandidatesTable } from "@/lib/db";
import { rowToCandidate } from "@/lib/candidate-types";

// 외부 지원자 초대 생성(관리자 화면에서 호출) + 목록 조회.
// 토큰은 지원자 본인만 아는 값으로, 회사 계정 없이 /apply/[token]에서
// 로그인 없이 응시할 수 있게 해준다.

export async function GET() {
  const db = getSql();
  if (!db) {
    return Response.json({ error: "DATABASE_URL이 설정되어 있지 않습니다. Vercel의 Postgres(Neon) 스토리지를 연결해주세요." }, { status: 500 });
  }
  await ensureCandidatesTable(db);
  const rows = await db`SELECT * FROM candidates ORDER BY created_at DESC`;
  return Response.json({ candidates: rows.map(rowToCandidate) });
}

export async function POST(request: Request) {
  const db = getSql();
  if (!db) {
    return Response.json({ error: "DATABASE_URL이 설정되어 있지 않습니다. Vercel의 Postgres(Neon) 스토리지를 연결해주세요." }, { status: 500 });
  }

  const body = (await request.json()) as Partial<{ name: string; email: string }>;
  const name = body.name?.trim();
  const email = body.email?.trim();
  if (!name || !email) {
    return Response.json({ error: "name, email이 모두 필요합니다." }, { status: 400 });
  }

  await ensureCandidatesTable(db);
  const id = randomUUID();
  const token = randomUUID();
  await db`
    INSERT INTO candidates (id, name, email, token)
    VALUES (${id}, ${name}, ${email}, ${token})
  `;

  return Response.json({ id, token });
}
