import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type Sql = NeonQueryFunction<false, false>;

// Vercel의 Neon(Postgres) 스토리지를 연결하면 DATABASE_URL이 자동으로 주입된다.
// 로컬 개발 환경 등 DB가 연결되지 않은 곳에서는 null을 반환해 호출부가
// "DB 미설정" 에러를 내려줄 수 있게 한다 — ANTHROPIC_API_KEY 처리 방식과 동일.
let sql: Sql | null = null;
let migrated = false;

export function getSql(): Sql | null {
  if (!process.env.DATABASE_URL) return null;
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}

// 별도 마이그레이션 도구 없이, 테이블이 없으면 그때그때 만든다(포트폴리오 규모에 맞는 최소 구성).
export async function ensureCandidatesTable(db: Sql): Promise<void> {
  if (migrated) return;
  await db`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      submitted_at TIMESTAMPTZ,
      objective_answers JSONB,
      checklist_answers JSONB,
      scenario_answers JSONB,
      scenario_opinions JSONB NOT NULL DEFAULT '[]',
      axis_confirmations JSONB NOT NULL DEFAULT '[]'
    )
  `;
  migrated = true;
}
