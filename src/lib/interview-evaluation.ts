// 면접관별 평가 기록. 실제 입력 폼(항목별 점수+코멘트)은 "면접 결과 기록"
// 단계에서 만들지만, 데이터 형태는 "면접관 관리·편향 체크"가 먼저 읽어 쓸 수
// 있도록 여기서 정의해둔다 — 아직 평가가 하나도 없으면 편향 체크 쪽에서는
// "평가 기록 없음"으로 정직하게 보여준다(점수를 지어내지 않는다).
export interface InterviewEvaluation {
  candidateId: string;
  interviewerName: string; // InterviewAssignment의 internalInterviewer/externalInterviewer와 매칭
  score: number; // 항목별 점수 합(=종합 점수), 0~100
  breakdown: Record<string, number>; // EVALUATION_CRITERIA key별 점수
  comment: string;
  evaluatedAt: string; // ISO datetime
}

// 평가표 항목. 4개 항목 × 25점 = 100점 만점.
export const EVALUATION_CRITERIA = [
  { key: "jobFit", label: "직무 역량", max: 25 },
  { key: "communication", label: "커뮤니케이션", max: 25 },
  { key: "problemSolving", label: "문제해결력", max: 25 },
  { key: "cultureFit", label: "조직 적합도", max: 25 },
] as const;

export function averageScore(evaluations: InterviewEvaluation[]): number | null {
  if (evaluations.length === 0) return null;
  return evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;
}
