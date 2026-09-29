import { OBJECTIVE_ITEMS, CHECKLIST_ITEMS, SCENARIO_ITEMS } from "./ai-assessment-items";
import {
  ASSESSMENT_AXES,
  type AssessmentAxisId,
  type AssessmentLevel,
  type AssessmentResponse,
  type AxisConfirmation,
  type ScenarioAiOpinion,
} from "./ai-assessment-types";

// 정답 키 — 문항 정의(ai-assessment-items.ts)와 분리해서 여기에만 둔다.
// ai-assessment/(PR #4) scoring.js의 ANSWER_KEY(1-based)를 0-based로 옮긴 값.
//   A5:2,A6:1,A7:4,A8:3 / B5:2,B6:4,B7:1,B8:3 / C5:2,C6:3,C7:1,C8:4 / D5:4,D6:2,D7:1,D8:3
const ANSWER_KEY: Record<string, number> = {
  AU1: 1, AU2: 0, AU3: 3, AU4: 2,
  OQ1: 1, OQ2: 3, OQ3: 0, OQ4: 2, OQ5: 1, OQ6: 2, OQ7: 0, OQ8: 3,
  RM1: 3, RM2: 1, RM3: 0, RM4: 2,
};

// 교재 부록 E 기준 수준 구분을 그대로 재사용.
const LEVELS: { min: number; name: AssessmentLevel }[] = [
  { min: 80, name: "전문가" },
  { min: 65, name: "고급" },
  { min: 50, name: "중급" },
  { min: 33, name: "초급" },
  { min: 0, name: "입문" },
];

// 객관식+시나리오 축(결과물품질/리스크관리)에서 두 점수를 섞는 비율.
const OBJECTIVE_SCENARIO_WEIGHTS = { objective: 0.5, scenario: 0.5 };

function levelOf(score: number): AssessmentLevel {
  for (const l of LEVELS) if (score >= l.min) return l.name;
  return "입문";
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export interface AxisScoreResult {
  axis: AssessmentAxisId;
  name: string;
  objectiveScore: number | null;
  objectiveCorrect: number | null;
  objectiveTotal: number | null;
  scenarioScore: number | null;
  scenarioComment: string | null;
  selfReportScore: number | null;
  provisionalScore: number;
  confirmedScore: number | null;
  finalScore: number;
  level: AssessmentLevel;
  pending: boolean; // 서술형 채점 대기 등으로 잠정치가 아직 불완전함
}

export interface AssessmentResult {
  staffId: string;
  responseId: string;
  totalScore: number;
  level: AssessmentLevel;
  axes: AxisScoreResult[];
}

export function scoreResponse(
  response: AssessmentResponse,
  scenarioOpinions: ScenarioAiOpinion[],
  axisConfirmations: AxisConfirmation[]
): AssessmentResult {
  const opinionByItem = new Map(scenarioOpinions.map((o) => [`${o.responseId}::${o.itemId}`, o]));
  const confirmationByAxis = new Map(axisConfirmations.map((c) => [`${c.responseId}::${c.axis}`, c]));

  const axes: AxisScoreResult[] = ASSESSMENT_AXES.map((axisDef) => {
    const objectiveItems = OBJECTIVE_ITEMS.filter((it) => it.axis === axisDef.id);
    const checklistItems = CHECKLIST_ITEMS.filter((it) => it.axis === axisDef.id);
    const scenarioItems = SCENARIO_ITEMS.filter((it) => it.axis === axisDef.id);

    let objectiveScore: number | null = null;
    let objectiveCorrect: number | null = null;
    let objectiveTotal: number | null = null;
    if (objectiveItems.length > 0) {
      objectiveCorrect = objectiveItems.filter(
        (it) => response.objectiveAnswers[it.id] === ANSWER_KEY[it.id]
      ).length;
      objectiveTotal = objectiveItems.length;
      objectiveScore = round1((objectiveCorrect / objectiveTotal) * 100);
    }

    let selfReportScore: number | null = null;
    if (checklistItems.length > 0) {
      const answers = checklistItems.map((it) => response.checklistAnswers[it.id]).filter((v) => v != null);
      const avg = answers.length > 0 ? answers.reduce((s, v) => s + v, 0) / answers.length : 1;
      selfReportScore = round1(((avg - 1) / 4) * 100);
    }

    let scenarioScore: number | null = null;
    let scenarioComment: string | null = null;
    let pending = false;
    if (scenarioItems.length > 0) {
      const opinions = scenarioItems
        .map((it) => opinionByItem.get(`${response.id}::${it.id}`))
        .filter((o): o is ScenarioAiOpinion => !!o);
      if (opinions.length === scenarioItems.length && opinions.length > 0) {
        scenarioScore = round1(opinions.reduce((s, o) => s + o.score, 0) / opinions.length);
        scenarioComment = opinions.map((o) => o.comment).join(" / ");
      } else {
        pending = true;
      }
    }

    let provisionalScore: number;
    if (objectiveScore !== null && scenarioItems.length > 0) {
      provisionalScore = scenarioScore !== null
        ? round1(objectiveScore * OBJECTIVE_SCENARIO_WEIGHTS.objective + scenarioScore * OBJECTIVE_SCENARIO_WEIGHTS.scenario)
        : objectiveScore; // 시나리오 채점 대기 중에는 객관식 점수만으로 잠정치를 낸다
    } else if (objectiveScore !== null) {
      provisionalScore = objectiveScore;
    } else {
      provisionalScore = selfReportScore ?? 0;
    }

    const confirmation = confirmationByAxis.get(`${response.id}::${axisDef.id}`);
    const confirmedScore = confirmation?.confirmedScore ?? null;
    const finalScore = confirmedScore ?? provisionalScore;

    return {
      axis: axisDef.id,
      name: axisDef.name,
      objectiveScore,
      objectiveCorrect,
      objectiveTotal,
      scenarioScore,
      scenarioComment,
      selfReportScore,
      provisionalScore,
      confirmedScore,
      finalScore,
      level: levelOf(finalScore),
      pending,
    };
  });

  const totalScore = round1(axes.reduce((s, a) => s + a.finalScore, 0) / axes.length);

  return {
    staffId: response.staffId,
    responseId: response.id,
    totalScore,
    level: levelOf(totalScore),
    axes,
  };
}

export { ANSWER_KEY, levelOf };
