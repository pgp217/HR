"use client";

import { useMemo } from "react";
import { useRecruit } from "./RecruitContext";
import { EXTERNAL_INTERVIEWERS } from "@/lib/interview-scheduling";

interface InterviewerStat {
  name: string;
  affiliation: "내부" | "외부";
  assignedCount: number;
  evaluationCount: number;
  averageScore: number | null;
  deviation: number | null; // 전체 평균 대비 편차
}

export default function InterviewerBiasCheck() {
  const { interviewAssignments, interviewEvaluations } = useRecruit();

  const stats = useMemo<InterviewerStat[]>(() => {
    const names = new Set<string>();
    for (const a of interviewAssignments) {
      names.add(a.internalInterviewer);
      names.add(a.externalInterviewer);
    }

    const overallScores = interviewEvaluations.map((e) => e.score);
    const overallAvg =
      overallScores.length > 0 ? overallScores.reduce((s, v) => s + v, 0) / overallScores.length : null;

    return Array.from(names)
      .map((name) => {
        const assignedCount = interviewAssignments.filter(
          (a) => a.internalInterviewer === name || a.externalInterviewer === name
        ).length;
        const myEvals = interviewEvaluations.filter((e) => e.interviewerName === name);
        const averageScore =
          myEvals.length > 0 ? myEvals.reduce((s, e) => s + e.score, 0) / myEvals.length : null;
        return {
          name,
          affiliation: EXTERNAL_INTERVIEWERS.includes(name) ? ("외부" as const) : ("내부" as const),
          assignedCount,
          evaluationCount: myEvals.length,
          averageScore,
          deviation: averageScore !== null && overallAvg !== null ? averageScore - overallAvg : null,
        };
      })
      .sort((a, b) => b.assignedCount - a.assignedCount);
  }, [interviewAssignments, interviewEvaluations]);

  const counts = stats.map((s) => s.assignedCount);
  const balanced = counts.length === 0 || Math.max(...counts) - Math.min(...counts) <= 1;

  function deviationStyle(deviation: number | null): string {
    if (deviation === null) return "text-gray-400";
    if (Math.abs(deviation) >= 10) return "font-semibold text-red-600";
    if (Math.abs(deviation) >= 5) return "font-medium text-amber-600";
    return "text-gray-700";
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">면접관 관리 및 편향 체크</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            면접관별 누적 배정 횟수와 채점 편차(전체 평균 대비)를 확인합니다.
          </p>
        </div>
        {stats.length > 0 && (
          <span
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              balanced ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {balanced ? "배정 균형" : "배정 쏠림 주의"}
          </span>
        )}
      </div>

      {stats.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">
          배정된 면접 일정이 없습니다. 위 &ldquo;AI 기반 일정 자동 배정&rdquo;을 먼저 실행해주세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">면접관</th>
                <th className="px-4 py-2 font-medium">소속</th>
                <th className="px-4 py-2 font-medium">누적 배정 횟수</th>
                <th className="px-4 py-2 font-medium">평가 건수</th>
                <th className="px-4 py-2 font-medium">평균 부여 점수</th>
                <th className="px-4 py-2 font-medium">전체 평균 대비 편차</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.name} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.affiliation}</td>
                  <td className="px-4 py-2.5 text-gray-700">{s.assignedCount}회</td>
                  <td className="px-4 py-2.5 text-gray-700">{s.evaluationCount}건</td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {s.averageScore !== null ? `${s.averageScore.toFixed(1)}점` : "-"}
                  </td>
                  <td className={`px-4 py-2.5 ${deviationStyle(s.deviation)}`}>
                    {s.deviation !== null
                      ? `${s.deviation > 0 ? "+" : ""}${s.deviation.toFixed(1)}점`
                      : "평가 기록 없음"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
