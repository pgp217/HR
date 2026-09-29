"use client";

import { useMemo, useState } from "react";
import { FREQUENCY_LABELS } from "@/lib/ai-assessment-types";
import { ASSESSMENT_FLOW, axisName, isFlowEntryAnswered, type FlowAnswers } from "@/lib/ai-assessment-flow";

interface Props {
  headingLabel?: string;
  onSubmit: (answers: FlowAnswers) => void;
}

// 30문항 응시 화면(사이드바 진행 현황 + 문항 + 이전/다음/제출) — 내부 직원
// 응시(TestRunner)와 외부 지원자 응시(ApplyRunner)가 그대로 공유한다.
export default function AssessmentFlowRunner({ headingLabel, onSubmit }: Props) {
  const [index, setIndex] = useState(0);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, number>>({});
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, number>>({});
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, string>>({});

  const answers: FlowAnswers = { objectiveAnswers, checklistAnswers, scenarioAnswers };

  const answeredCount = useMemo(() => {
    return ASSESSMENT_FLOW.filter((f) => isFlowEntryAnswered(f, answers)).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectiveAnswers, checklistAnswers, scenarioAnswers]);

  const firstUnansweredIndex = useMemo(() => {
    return ASSESSMENT_FLOW.findIndex((f) => !isFlowEntryAnswered(f, answers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectiveAnswers, checklistAnswers, scenarioAnswers]);

  const current = ASSESSMENT_FLOW[index];
  const allAnswered = answeredCount === ASSESSMENT_FLOW.length;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="shrink-0 rounded-lg border border-gray-200 bg-white p-3 lg:w-64">
        {headingLabel && <p className="mb-1 text-xs font-medium text-blue-600">{headingLabel}</p>}
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            진행 {answeredCount}/{ASSESSMENT_FLOW.length}
          </span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${(answeredCount / ASSESSMENT_FLOW.length) * 100}%` }}
          />
        </div>
        <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto text-sm">
          {ASSESSMENT_FLOW.map((entry, i) => {
            const answered = isFlowEntryAnswered(entry, answers);
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
          문항 {index + 1} / {ASSESSMENT_FLOW.length} · {axisName(current.item.axis)}
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
          {index < ASSESSMENT_FLOW.length - 1 ? (
            <button
              onClick={() => setIndex((i) => Math.min(ASSESSMENT_FLOW.length - 1, i + 1))}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              다음
            </button>
          ) : allAnswered ? (
            <button
              onClick={() => onSubmit(answers)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              제출
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600">아직 답하지 않은 문항이 있습니다.</span>
              <button
                onClick={() => setIndex(firstUnansweredIndex)}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100"
              >
                미응답 {firstUnansweredIndex + 1}번 문항으로 이동
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
