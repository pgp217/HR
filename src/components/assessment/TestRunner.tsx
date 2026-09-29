"use client";

import { useState } from "react";
import { staffList } from "@/lib/mock-data";
import { SCENARIO_ITEMS } from "@/lib/ai-assessment-items";
import { axisName, type FlowAnswers } from "@/lib/ai-assessment-flow";
import { useAssessment } from "./AssessmentContext";
import AssessmentFlowRunner from "./AssessmentFlowRunner";

export default function TestRunner() {
  const { activeRound, responses, submitResponse, recordScenarioOpinion } = useAssessment();
  const [staffId, setStaffId] = useState("");
  const [phase, setPhase] = useState<"pick" | "answer" | "grading" | "done">("pick");
  const [gradingLabel, setGradingLabel] = useState("");

  const alreadySubmitted = staffId
    ? responses.some((r) => r.staffId === staffId && r.roundId === activeRound?.id)
    : false;

  function startTest() {
    if (!staffId) return;
    setPhase("answer");
  }

  async function handleSubmit(answers: FlowAnswers) {
    const response = submitResponse({ staffId, ...answers });
    setPhase("grading");

    for (const item of SCENARIO_ITEMS) {
      const answer = answers.scenarioAnswers[item.id];
      if (answer == null) continue;
      setGradingLabel(`${axisName(item.axis)} 시나리오 채점 중...`);
      try {
        const res = await fetch("/api/ai-assessment/grade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: item.prompt, rubric: item.rubric, answer }),
        });
        const data = await res.json();
        if (res.ok) {
          recordScenarioOpinion({ responseId: response.id, itemId: item.id, score: data.score, comment: data.comment });
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
        <p className="mb-1 text-xs font-medium text-blue-600">{activeRound?.name ?? "진행 중인 회차 없음"}</p>
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
  return <AssessmentFlowRunner headingLabel={activeRound?.name} onSubmit={handleSubmit} />;
}
