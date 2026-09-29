"use client";

import { useState } from "react";
import type { Staff } from "@/lib/types";
import type { AssessmentResult } from "@/lib/ai-assessment-scoring";
import { useAssessment } from "./AssessmentContext";

interface Props {
  staff: Staff;
  manager: Staff | null;
  result: AssessmentResult;
  onClose: () => void;
}

const levelStyle: Record<string, string> = {
  전문가: "bg-green-50 text-green-700",
  고급: "bg-blue-50 text-blue-700",
  중급: "bg-amber-50 text-amber-700",
  초급: "bg-orange-50 text-orange-700",
  입문: "bg-gray-100 text-gray-600",
};

export default function ResultDetail({ staff, manager, result, onClose }: Props) {
  const { confirmAxis } = useAssessment();
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});

  function handleConfirm(axis: string, defaultScore: number) {
    const raw = draftScores[axis];
    const score = raw != null && raw !== "" ? Number(raw) : defaultScore;
    if (!Number.isFinite(score) || score < 0 || score > 100) return;
    confirmAxis({ responseId: result.responseId, axis: axis as never, confirmedScore: score, confirmedBy: manager?.id ?? "" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {staff.name} · {staff.team}
            </h3>
            <p className="text-xs text-gray-400">팀장: {manager?.name ?? "-"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-md bg-gray-50 px-4 py-3">
          <span className="text-2xl font-bold text-gray-900">{result.totalScore}점</span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${levelStyle[result.level]}`}>{result.level}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-2 py-2 font-medium">축</th>
                <th className="px-2 py-2 font-medium">객관식</th>
                <th className="px-2 py-2 font-medium">AI 1차 의견(서술형)</th>
                <th className="px-2 py-2 font-medium">자기보고</th>
                <th className="px-2 py-2 font-medium">잠정 점수</th>
                <th className="px-2 py-2 font-medium">팀장 확정</th>
              </tr>
            </thead>
            <tbody>
              {result.axes.map((axis) => (
                <tr key={axis.axis} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-2.5 font-medium text-gray-900">
                    {axis.name}
                    <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${levelStyle[axis.level]}`}>
                      {axis.level}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-gray-600">
                    {axis.objectiveScore != null ? `${axis.objectiveCorrect}/${axis.objectiveTotal} (${axis.objectiveScore}점)` : "-"}
                  </td>
                  <td className="px-2 py-2.5 text-gray-600">
                    {axis.pending ? (
                      <span className="text-amber-600">채점 대기</span>
                    ) : axis.scenarioScore != null ? (
                      <span title={axis.scenarioComment ?? ""} className="cursor-help">
                        {axis.scenarioScore}점
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-gray-600">{axis.selfReportScore != null ? `${axis.selfReportScore}점` : "-"}</td>
                  <td className="px-2 py-2.5 font-medium text-gray-900">{axis.provisionalScore}점</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder={String(axis.confirmedScore ?? axis.provisionalScore)}
                        value={draftScores[axis.axis] ?? ""}
                        onChange={(e) => setDraftScores((prev) => ({ ...prev, [axis.axis]: e.target.value }))}
                        className="w-16 rounded border border-gray-300 px-1.5 py-1 text-xs"
                      />
                      <button
                        onClick={() => handleConfirm(axis.axis, axis.provisionalScore)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        {axis.confirmedScore != null ? "재확정" : "확정"}
                      </button>
                      {axis.confirmedScore != null && (
                        <span className="text-xs text-green-600">확정됨</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
