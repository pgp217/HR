"use client";

import { useMemo, useState } from "react";
import { staffList } from "@/lib/mock-data";
import { OBJECTIVE_ITEMS, CHECKLIST_ITEMS, SCENARIO_ITEMS } from "@/lib/ai-assessment-items";
import { ASSESSMENT_AXES, FREQUENCY_LABELS, type ObjectiveItem, type ChecklistItem, type ScenarioItem } from "@/lib/ai-assessment-types";
import { useAssessment } from "./AssessmentContext";

type FlowEntry =
  | { kind: "objective"; item: ObjectiveItem }
  | { kind: "scenario"; item: ScenarioItem }
  | { kind: "checklist"; item: ChecklistItem };

const axisName = (id: string) => ASSESSMENT_AXES.find((a) => a.id === id)?.name ?? id;

// 응시 순서: AI 이해(객관식) → 결과물품질(객관식+서술형) → 리스크관리(객관식+서술형)
// → 활용빈도(체크리스트) → 전파도(체크리스트).
const FLOW: FlowEntry[] = [
  ...OBJECTIVE_ITEMS.filter((i) => i.axis === "aiUnderstanding").map((item) => ({ kind: "objective" as const, item })),
  ...OBJECTIVE_ITEMS.filter((i) => i.axis === "outputQuality").map((item) => ({ kind: "objective" as const, item })),
  ...SCENARIO_ITEMS.filter((i) => i.axis === "outputQuality").map((item) => ({ kind: "scenario" as const, item })),
  ...OBJECTIVE_ITEMS.filter((i) => i.axis === "riskManagement").map((item) => ({ kind: "objective" as const, item })),
  ...SCENARIO_ITEMS.filter((i) => i.axis === "riskManagement").map((item) => ({ kind: "scenario" as const, item })),
  ...CHECKLIST_ITEMS.filter((i) => i.axis === "usageFrequency").map((item) => ({ kind: "checklist" as const, item })),
  ...CHECKLIST_ITEMS.filter((i) => i.axis === "dissemination").map((item) => ({ kind: "checklist" as const, item })),
];

export default function TestRunner() {
  const { responses, submitResponse, recordScenarioOpinion } = useAssessment();
  const [staffId, setStaffId] = useState("");
  const [index, setIndex] = useState(0);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, number>>({});
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, number>>({});
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"pick" | "answer" | "grading" | "done">("pick");
  const [gradingLabel, setGradingLabel] = useState("");

  const answeredCount = useMemo(() => {
    return FLOW.filter((f) => {
      if (f.kind === "objective") return objectiveAnswers[f.item.id] != null;
      if (f.kind === "checklist") return checklistAnswers[f.item.id] != null;
      return (scenarioAnswers[f.item.id] ?? "").trim() !== "";
    }).length;
  }, [objectiveAnswers, checklistAnswers, scenarioAnswers]);

  const alreadySubmitted = staffId ? responses.some((r) => r.staffId === staffId) : false;
  const current = FLOW[index];
  const allAnswered = answeredCount === FLOW.length;

  function startTest() {
    if (!staffId) return;
    setPhase("answer");
  }

  async function handleSubmit() {
    const response = submitResponse({ staffId, objectiveAnswers, checklistAnswers, scenarioAnswers });
    setPhase("grading");

    for (const entry of FLOW) {
      if (entry.kind !== "scenario") continue;
      setGradingLabel(`${axisName(entry.item.axis)} 시나리오 채점 중...`);
      try {
        const res = await fetch("/api/ai-assessment/grade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: entry.item.prompt,
            rubric: entry.item.rubric,
            answer: scenarioAnswers[entry.item.id] ?? "",
          }),
        });
        const data = await res.json();
        if (res.ok) {
          recordScenarioOpinion({ responseId: response.id, itemId: entry.item.id, score: data.score, comment: data.comment });
        }
      } catch {
        // 채점 API 호출이 실패해도 응답 자체는 이미 저장됐으므로, 팀장이 나중에
        // 관리 화면에서 수동으로 축 점수를 확정할 수 있다.
      }
    }
    setPhase("done");
  }

  if (phase === "pick") {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">응시자 선택</h2>
        <p className="mb-4 text-sm text-gray-500">진단을 응시할 본인을 선택해주세요.</p>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">선택하세요</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.team})
            </option>
          ))}
        </select>
        {alreadySubmitted && (
          <p className="mt-2 text-xs text-amber-600">이미 진단을 제출한 기록이 있습니다. 다시 응시하면 이전 응답을 덮어씁니다.</p>
        )}
        <button
          onClick={startTest}
          disabled={!staffId}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          진단 시작
        </button>
      </div>
    );
  }

  if (phase === "grading") {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-gray-900">서술형 답안을 AI가 1차 채점하고 있습니다...</p>
        <p className="mt-2 text-xs text-gray-400">{gradingLabel}</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-base font-semibold text-green-800">제출 완료</p>
        <p className="mt-2 text-sm text-green-700">
          객관식·체크리스트 채점과 서술형 AI 1차 채점까지 끝났습니다. 결과는 진단 관리 화면에서 확인할 수 있습니다.
        </p>
        <a
          href="/ai-assessment/dashboard"
          className="mt-4 inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          진단 관리로 이동
        </a>
      </div>
    );
  }

  // phase === "answer"
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="shrink-0 rounded-lg border border-gray-200 bg-white p-3 lg:w-64">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>진행 {answeredCount}/{FLOW.length}</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${(answeredCount / FLOW.length) * 100}%` }}
          />
        </div>
        <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto text-sm">
          {FLOW.map((entry, i) => {
            const answered =
              entry.kind === "objective"
                ? objectiveAnswers[entry.item.id] != null
                : entry.kind === "checklist"
                  ? checklistAnswers[entry.item.id] != null
                  : (scenarioAnswers[entry.item.id] ?? "").trim() !== "";
            return (
              <li key={entry.item.id}>
                <button
                  onClick={() => setIndex(i)}
                  className={`flex w-full flex-col rounded-md px-2 py-1.5 text-left ${
                    i === index ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">
                    문항 {i + 1} {answered && <span className="text-green-600">✓</span>}
                  </span>
                  <span className="text-xs text-gray-400">
                    {axisName(entry.item.axis)} · {entry.kind === "objective" ? "객관식" : entry.kind === "checklist" ? "체크" : "서술형"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-6">
        <p className="mb-1 text-xs font-medium text-gray-400">
          문항 {index + 1} / {FLOW.length} · {axisName(current.item.axis)}
        </p>

        {current.kind === "objective" && (
          <div>
            <p className="mb-4 text-base text-gray-900">{current.item.text}</p>
            <div className="flex flex-col gap-2">
              {current.item.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setObjectiveAnswers((prev) => ({ ...prev, [current.item.id]: i }))}
                  className={`rounded-md border px-4 py-3 text-left text-sm ${
                    objectiveAnswers[current.item.id] === i
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {current.kind === "checklist" && (
          <div>
            <p className="mb-4 text-base text-gray-900">{current.item.text}</p>
            <div className="flex flex-col gap-2">
              {FREQUENCY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setChecklistAnswers((prev) => ({ ...prev, [current.item.id]: i + 1 }))}
                  className={`rounded-md border px-4 py-3 text-left text-sm ${
                    checklistAnswers[current.item.id] === i + 1
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {current.kind === "scenario" && (
          <div>
            <p className="mb-4 whitespace-pre-wrap text-base text-gray-900">{current.item.prompt}</p>
            <textarea
              value={scenarioAnswers[current.item.id] ?? ""}
              onChange={(e) => setScenarioAnswers((prev) => ({ ...prev, [current.item.id]: e.target.value }))}
              rows={6}
              placeholder="자유롭게 서술해주세요."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          {index < FLOW.length - 1 ? (
            <button
              onClick={() => setIndex((i) => Math.min(FLOW.length - 1, i + 1))}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              제출
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
