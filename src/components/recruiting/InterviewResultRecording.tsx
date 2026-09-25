"use client";

import { useMemo, useState } from "react";
import { useRecruit } from "./RecruitContext";
import { averageScore, type InterviewEvaluation } from "@/lib/interview-evaluation";
import EvaluationFormModal from "./EvaluationFormModal";
import type { RecruitStage } from "@/lib/recruit-types";

const stageStyles: Partial<Record<RecruitStage, string>> = {
  합격: "bg-green-50 text-green-700",
  불합격: "bg-red-50 text-red-700",
};

export default function InterviewResultRecording() {
  const { candidates, interviewAssignments, interviewEvaluations, submitEvaluation, updateCandidateStage } =
    useRecruit();

  const [editing, setEditing] = useState<{ candidateId: string; interviewerName: string } | null>(null);

  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const evaluationByKey = useMemo(() => {
    const map = new Map<string, InterviewEvaluation>();
    for (const e of interviewEvaluations) map.set(`${e.candidateId}::${e.interviewerName}`, e);
    return map;
  }, [interviewEvaluations]);

  // 처리해야 할 것(평가 완료·전형 처리 대기)이 위로, 평가 입력이 아직 안 된
  // 건이 다음, 이미 합격/불합격 처리된 과거 이력이 가장 아래로 오도록
  // 정렬한다 — 노쇼 방지 패널의 "할 일 우선" 정렬과 같은 원칙이다.
  function rowPriority(candidateStage: string, overall: number | null): number {
    const decided = candidateStage === "합격" || candidateStage === "불합격";
    if (decided) return 2;
    if (overall !== null) return 0;
    return 1;
  }

  const rows = useMemo(() => {
    return interviewAssignments
      .map((a) => {
        const candidate = candidateById.get(a.candidateId);
        if (!candidate) return null;
        const internalEval = evaluationByKey.get(`${a.candidateId}::${a.internalInterviewer}`);
        const externalEval = evaluationByKey.get(`${a.candidateId}::${a.externalInterviewer}`);
        const overall = averageScore([internalEval, externalEval].filter((e): e is InterviewEvaluation => !!e));
        return { assignment: a, candidate, internalEval, externalEval, overall };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => {
        const p = rowPriority(a.candidate.stage, a.overall) - rowPriority(b.candidate.stage, b.overall);
        if (p !== 0) return p;
        return `${a.assignment.date}${a.assignment.startTime}`.localeCompare(
          `${b.assignment.date}${b.assignment.startTime}`
        );
      });
  }, [interviewAssignments, candidateById, evaluationByKey]);

  const editingRow = editing
    ? rows.find((r) => r.assignment.candidateId === editing.candidateId)
    : undefined;
  const editingExisting = editing
    ? evaluationByKey.get(`${editing.candidateId}::${editing.interviewerName}`)
    : undefined;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">면접 결과 기록</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          내부·외부 면접관이 각자 평가표를 입력하면 두 점수의 평균이 종합 점수가 됩니다. 종합 점수를
          근거로 합격/불합격 처리하면 채용 대시보드의 전형 단계별 인원에 바로 반영됩니다.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">
          배정된 면접 일정이 없습니다. 위 &ldquo;AI 기반 일정 자동 배정&rdquo;을 먼저 실행해주세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">지원자</th>
                <th className="px-4 py-2 font-medium">내부 면접관 평가</th>
                <th className="px-4 py-2 font-medium">외부 면접관 평가</th>
                <th className="px-4 py-2 font-medium">종합 점수</th>
                <th className="px-4 py-2 font-medium">전형 처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ assignment: a, candidate: c, internalEval, externalEval, overall }) => {
                const decided = c.stage === "합격" || c.stage === "불합격";
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">{a.internalInterviewer}</span>
                        {internalEval ? (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                            {internalEval.score}점
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">미입력</span>
                        )}
                        <button
                          onClick={() => setEditing({ candidateId: c.id, interviewerName: a.internalInterviewer })}
                          className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          {internalEval ? "수정" : "평가 입력"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">{a.externalInterviewer}</span>
                        {externalEval ? (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                            {externalEval.score}점
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">미입력</span>
                        )}
                        <button
                          onClick={() => setEditing({ candidateId: c.id, interviewerName: a.externalInterviewer })}
                          className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          {externalEval ? "수정" : "평가 입력"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">
                      {overall !== null ? `${overall.toFixed(1)}점` : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      {decided ? (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${stageStyles[c.stage]}`}
                        >
                          {c.stage} 처리됨
                        </span>
                      ) : overall === null ? (
                        <span className="text-xs text-gray-300">평가 후 처리 가능</span>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateCandidateStage(c.id, "합격")}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            합격
                          </button>
                          <button
                            onClick={() => updateCandidateStage(c.id, "불합격")}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            불합격
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && editingRow && (
        <EvaluationFormModal
          candidateName={editingRow.candidate.name}
          interviewerName={editing.interviewerName}
          existing={editingExisting}
          onClose={() => setEditing(null)}
          onSubmit={(breakdown, comment) => {
            submitEvaluation(editing.candidateId, editing.interviewerName, breakdown, comment);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
