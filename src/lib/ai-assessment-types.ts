// AI 역량진단 (5축). ai-assessment/(PR #4, genai-book 기반 A~E 5영역 40문항)를
// 앱 안으로 옮기면서 아래처럼 재구성한다 — 자세한 설계는
// docs/references/performance-management-reference.md와 무관하며, 이 세션에서
// 직접 정한 매핑을 따른다:
//   1. AI 이해(aiUnderstanding)     — 객관식만 (기존 A영역 객관식 4문항)
//   2. 활용빈도(usageFrequency)     — 체크리스트 자기보고 + 팀장 확인
//   3. 결과물품질(outputQuality)    — 객관식(기존 B·C영역 객관식 8문항) + 서술형 시나리오
//   4. 리스크관리(riskManagement)   — 객관식(기존 D영역 객관식 4문항) + 서술형 시나리오
//   5. 전파도(dissemination)        — 체크리스트 자기보고 + 팀장 확인 (기존 E3 등 일부 재사용)
//
// 서술형 시나리오는 제출 즉시 서버 API 라우트(/api/ai-assessment/grade)가
// Claude API를 호출해 1차 채점한다. 팀장은 그 AI 1차 점수를 검토해서 축
// 단위로 최종 점수를 확정한다(AxisConfirmation) — AI 1차 판정과 팀장 확정을
// 분리해서 저장하는 건 그대로 유지한다.

export type AssessmentAxisId =
  | "aiUnderstanding"
  | "usageFrequency"
  | "outputQuality"
  | "riskManagement"
  | "dissemination";

export type AssessmentMethod = "objective" | "checklist" | "objective+scenario";

export interface AssessmentAxisDef {
  id: AssessmentAxisId;
  name: string;
  method: AssessmentMethod;
  description: string;
}

export const ASSESSMENT_AXES: AssessmentAxisDef[] = [
  {
    id: "aiUnderstanding",
    name: "AI 이해",
    method: "objective",
    description: "생성형 AI의 작동 원리와 한계를 이해하는 정도",
  },
  {
    id: "usageFrequency",
    name: "활용빈도",
    method: "checklist",
    description: "실제 업무에 AI를 얼마나 자주, 폭넓게 활용하는지",
  },
  {
    id: "outputQuality",
    name: "결과물품질",
    method: "objective+scenario",
    description: "AI 결과물을 검증하고 업무 품질로 연결하는 능력",
  },
  {
    id: "riskManagement",
    name: "리스크관리",
    method: "objective+scenario",
    description: "환각·편향·보안 등 AI 활용 리스크에 대응하는 능력",
  },
  {
    id: "dissemination",
    name: "전파도",
    method: "checklist",
    description: "동료·팀에 AI 활용법을 얼마나 전파하는지",
  },
];

// 5점 척도(체크리스트 자기보고 공통 라벨) — 활용빈도/전파도 문항에 공통 사용.
export const FREQUENCY_LABELS = ["전혀 그렇지 않다", "거의 그렇지 않다", "보통이다", "자주 그렇다", "항상 그렇다"];

export interface ObjectiveItem {
  id: string;
  axis: AssessmentAxisId;
  text: string;
  options: string[]; // 정답 인덱스는 여기 없음 — ai-assessment-scoring.ts에만 있음
}

export interface ChecklistItem {
  id: string;
  axis: AssessmentAxisId;
  text: string;
}

export interface ScenarioItem {
  id: string;
  axis: AssessmentAxisId;
  prompt: string;
  rubric: string; // AI 1차 판정·팀장 확인 시 참고할 채점 기준(응시자에게는 노출하지 않는 화면에서만 사용)
}

export type AssessmentLevel = "입문" | "초급" | "중급" | "고급" | "전문가";

// 진단 회차 — 한 번에 하나만 "진행 중"(endDate 없음)이고, 새 회차를 시작하면
// 이전 회차는 자동으로 마감된다. 회차가 있어야 "이전 회차 대비 변화"를 잴 수 있다.
export interface AssessmentRound {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date, 없으면 진행 중
}

export interface AssessmentResponse {
  id: string;
  staffId: string;
  roundId: string;
  submittedAt: string; // ISO datetime
  objectiveAnswers: Record<string, number>; // itemId -> 선택한 보기 인덱스(0-based)
  checklistAnswers: Record<string, number>; // itemId -> 자기보고 응답(1~5)
  scenarioAnswers: Record<string, string>; // itemId -> 서술형 답안 원문
}

// 서술형 시나리오에 대한 "AI 1차 채점" — 제출 시 API 라우트가 즉시 채점해 저장한다.
export interface ScenarioAiOpinion {
  responseId: string;
  itemId: string;
  score: number; // 0~100
  comment: string;
  gradedAt: string;
}

// 축 단위 팀장 확정 — 체크리스트 축(활용빈도/전파도)은 자기보고를,
// 시나리오가 섞인 축(결과물품질/리스크관리)은 AI 1차 의견을 팀장이 검토해 확정한다.
export interface AxisConfirmation {
  responseId: string;
  axis: AssessmentAxisId;
  confirmedScore: number; // 0~100
  comment?: string;
  confirmedBy: string; // 팀장 staffId
  confirmedAt: string;
}
