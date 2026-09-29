import type { AssessmentResponse } from "./ai-assessment-types";

// 응답 신뢰 가능성 — 새 AI 호출 없이 이미 수집된 답변만으로 판단하는 기계적 점검.
// 결과를 "이 사람은 성의가 없다"고 단정하는 용도가 아니라, 팀장이 확정 전에
// 한 번 더 살펴볼 만한 응답을 표시해주는 참고 신호다.

export type ReliabilityFlagType = "straightlining" | "extremePositiveBias";

export interface ReliabilityFlag {
  type: ReliabilityFlagType;
  label: string;
}

const STRAIGHTLINE_RATIO = 0.8; // 같은 보기 비율이 이 이상이면 일자로 찍었을 가능성
const STRAIGHTLINE_MIN_ITEMS = 5; // 문항 수가 너무 적으면 우연히 같은 보기가 몰릴 수 있어 제외

function mostCommonRatio(values: number[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return max / values.length;
}

function isStraightlined(values: number[]): boolean {
  return values.length >= STRAIGHTLINE_MIN_ITEMS && mostCommonRatio(values) >= STRAIGHTLINE_RATIO;
}

export function checkReliability(response: AssessmentResponse): ReliabilityFlag[] {
  const flags: ReliabilityFlag[] = [];
  const objectiveValues = Object.values(response.objectiveAnswers);
  const checklistValues = Object.values(response.checklistAnswers);

  if (isStraightlined(objectiveValues) || isStraightlined(checklistValues)) {
    flags.push({
      type: "straightlining",
      label: "객관식 또는 체크리스트 응답이 대부분 같은 보기로 몰려 있어, 성의 없이 응답했을 가능성이 있습니다.",
    });
  }

  if (checklistValues.length > 0 && checklistValues.every((v) => v === 5)) {
    flags.push({
      type: "extremePositiveBias",
      label: "체크리스트 응답이 전부 '항상 그렇다'로, 실제보다 후하게 자기보고했을 가능성이 있습니다.",
    });
  }

  return flags;
}
