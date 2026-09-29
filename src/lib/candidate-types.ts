import type { AssessmentResponse, AxisConfirmation, ScenarioAiOpinion } from "./ai-assessment-types";

// 외부 지원자(회사 계정이 없는 신입 지원자 등) — 토큰 링크로 로그인 없이
// 응시하고, 응답은 DB(candidates 테이블)에 저장된다. 내부 직원 진단과 달리
// 회차(round) 개념 없이 지원자당 응시 1건만 다룬다.
export interface Candidate {
  id: string;
  name: string;
  email: string;
  token: string;
  createdAt: string;
  submittedAt: string | null;
  objectiveAnswers: Record<string, number> | null;
  checklistAnswers: Record<string, number> | null;
  scenarioAnswers: Record<string, string> | null;
  scenarioOpinions: ScenarioAiOpinion[];
  axisConfirmations: AxisConfirmation[];
}

// DB row(snake_case) -> Candidate(camelCase) 변환.
export function rowToCandidate(row: Record<string, unknown>): Candidate {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    token: row.token as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    submittedAt: row.submitted_at ? new Date(row.submitted_at as string).toISOString() : null,
    objectiveAnswers: (row.objective_answers as Record<string, number> | null) ?? null,
    checklistAnswers: (row.checklist_answers as Record<string, number> | null) ?? null,
    scenarioAnswers: (row.scenario_answers as Record<string, string> | null) ?? null,
    scenarioOpinions: (row.scenario_opinions as ScenarioAiOpinion[] | null) ?? [],
    axisConfirmations: (row.axis_confirmations as AxisConfirmation[] | null) ?? [],
  };
}

// scoreResponse()는 AssessmentResponse 모양만 보면 되므로, candidate.id를
// responseId/staffId로 삼아 그대로 재사용한다.
export function candidateToAssessmentResponse(candidate: Candidate): AssessmentResponse {
  return {
    id: candidate.id,
    staffId: candidate.id,
    roundId: "external",
    submittedAt: candidate.submittedAt ?? candidate.createdAt,
    objectiveAnswers: candidate.objectiveAnswers ?? {},
    checklistAnswers: candidate.checklistAnswers ?? {},
    scenarioAnswers: candidate.scenarioAnswers ?? {},
  };
}
