import { OBJECTIVE_ITEMS, CHECKLIST_ITEMS, SCENARIO_ITEMS } from "@/lib/ai-assessment-items";
import { ASSESSMENT_AXES, type ObjectiveItem, type ChecklistItem, type ScenarioItem } from "@/lib/ai-assessment-types";

export type FlowEntry =
  | { kind: "objective"; item: ObjectiveItem }
  | { kind: "scenario"; item: ScenarioItem }
  | { kind: "checklist"; item: ChecklistItem };

export const axisName = (id: string) => ASSESSMENT_AXES.find((a) => a.id === id)?.name ?? id;

// 응시 순서: AI 이해(객관식) → 결과물품질(객관식+서술형) → 리스크관리(객관식+서술형)
// → 활용빈도(체크리스트) → 전파도(체크리스트). 내부 직원 응시(TestRunner)와
// 외부 지원자 응시(ApplyRunner)가 동일한 순서를 공유한다.
export const ASSESSMENT_FLOW: FlowEntry[] = [
  ...OBJECTIVE_ITEMS.filter((i) => i.axis === "aiUnderstanding").map((item) => ({ kind: "objective" as const, item })),
  ...OBJECTIVE_ITEMS.filter((i) => i.axis === "outputQuality").map((item) => ({ kind: "objective" as const, item })),
  ...SCENARIO_ITEMS.filter((i) => i.axis === "outputQuality").map((item) => ({ kind: "scenario" as const, item })),
  ...OBJECTIVE_ITEMS.filter((i) => i.axis === "riskManagement").map((item) => ({ kind: "objective" as const, item })),
  ...SCENARIO_ITEMS.filter((i) => i.axis === "riskManagement").map((item) => ({ kind: "scenario" as const, item })),
  ...CHECKLIST_ITEMS.filter((i) => i.axis === "usageFrequency").map((item) => ({ kind: "checklist" as const, item })),
  ...CHECKLIST_ITEMS.filter((i) => i.axis === "dissemination").map((item) => ({ kind: "checklist" as const, item })),
];

export interface FlowAnswers {
  objectiveAnswers: Record<string, number>;
  checklistAnswers: Record<string, number>;
  scenarioAnswers: Record<string, string>;
}

export function isFlowEntryAnswered(entry: FlowEntry, answers: FlowAnswers): boolean {
  if (entry.kind === "objective") return answers.objectiveAnswers[entry.item.id] != null;
  if (entry.kind === "checklist") return answers.checklistAnswers[entry.item.id] != null;
  return (answers.scenarioAnswers[entry.item.id] ?? "").trim() !== "";
}
