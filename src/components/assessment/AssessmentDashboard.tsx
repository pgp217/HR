"use client";

import { useMemo, useState } from "react";
import { staffList } from "@/lib/mock-data";
import { useAssessment } from "./AssessmentContext";
import { scoreResponse } from "@/lib/ai-assessment-scoring";
import { checkReliability } from "@/lib/ai-assessment-reliability";
import type { AssessmentAxisId, AssessmentLevel } from "@/lib/ai-assessment-types";
import ResultDetail from "./ResultDetail";

type RowStatus = "미응시" | "채점 대기" | "확인 대기" | "확정 완료";

const statusStyle: Record<RowStatus, string> = {
  미응시: "bg-gray-100 text-gray-500",
  "채점 대기": "bg-amber-50 text-amber-700",
  "확인 대기": "bg-blue-50 text-blue-700",
  "확정 완료": "bg-green-50 text-green-700",
};

const statusPriority: Record<RowStatus, number> = {
  "채점 대기": 0,
  "확인 대기": 1,
  "확정 완료": 2,
  미응시: 3,
};

const LEVELS: AssessmentLevel[] = ["전문가", "고급", "중급", "초급", "입문"];

const levelBarColor: Record<AssessmentLevel, string> = {
  전문가: "bg-green-600",
  고급: "bg-blue-600",
  중급: "bg-amber-500",
  초급: "bg-orange-500",
  입문: "bg-gray-400",
};

export default function AssessmentDashboard() {
  const { rounds, activeRound, responses, scenarioOpinions, axisConfirmations, startNewRound, confirmAxis } = useAssessment();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [newRoundName, setNewRoundName] = useState("");
  const [showNewRoundForm, setShowNewRoundForm] = useState(false);

  const sortedRounds = useMemo(() => [...rounds].sort((a, b) => a.startDate.localeCompare(b.startDate)), [rounds]);
  const viewingRoundId = selectedRoundId ?? activeRound?.id ?? sortedRounds[sortedRounds.length - 1]?.id ?? null;
  const viewingRoundIndex = sortedRounds.findIndex((r) => r.id === viewingRoundId);
  const previousRound = viewingRoundIndex > 0 ? sortedRounds[viewingRoundIndex - 1] : null;

  const staffById = useMemo(() => new Map(staffList.map((s) => [s.id, s])), []);

  const responseByStaff = useMemo(() => {
    const map = new Map<string, (typeof responses)[number]>();
    for (const r of responses) {
      if (r.roundId === viewingRoundId) map.set(r.staffId, r);
    }
    return map;
  }, [responses, viewingRoundId]);

  const previousResponseByStaff = useMemo(() => {
    const map = new Map<string, (typeof responses)[number]>();
    if (!previousRound) return map;
    for (const r of responses) {
      if (r.roundId === previousRound.id) map.set(r.staffId, r);
    }
    return map;
  }, [responses, previousRound]);

  const rows = useMemo(() => {
    return staffList
      .map((staff) => {
        const response = responseByStaff.get(staff.id);
        if (!response) return { staff, response: null, result: null, status: "미응시" as RowStatus, prevResult: null, reliabilityFlags: [] };

        const result = scoreResponse(response, scenarioOpinions, axisConfirmations);
        const hasPending = result.axes.some((a) => a.pending);
        const hasUnconfirmed = result.axes.some((a) => a.confirmedScore == null);
        const status: RowStatus = hasPending ? "채점 대기" : hasUnconfirmed ? "확인 대기" : "확정 완료";

        const prevResponse = previousResponseByStaff.get(staff.id);
        const prevResult = prevResponse ? scoreResponse(prevResponse, scenarioOpinions, axisConfirmations) : null;
        const reliabilityFlags = checkReliability(response);

        return { staff, response, result, status, prevResult, reliabilityFlags };
      })
      .sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
  }, [responseByStaff, previousResponseByStaff, scenarioOpinions, axisConfirmations]);

  const targetCount = staffList.length;
  const completedCount = rows.filter((r) => r.response).length;
  const pendingGradeCount = rows.filter((r) => r.status === "채점 대기").length;
  const confirmedCount = rows.filter((r) => r.status === "확정 완료").length;

  // 조직 집계: 이번 회차에서 결과가 나온 사람 기준(팀장 확정 여부와 무관하게 잠정치 포함).
  const scoredRows = rows.filter((r) => r.result);

  // 순위: 이번 회차에서 결과가 나온 사람들 안에서 총점 기준(동점자는 같은 순위, 표준 경쟁 순위 방식).
  const rankByStaffId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of scoredRows) {
      const higherCount = scoredRows.filter((other) => other.result!.totalScore > row.result!.totalScore).length;
      map.set(row.staff.id, higherCount + 1);
    }
    return map;
  }, [scoredRows]);
  const levelCounts = useMemo(() => {
    const counts = new Map<AssessmentLevel, number>(LEVELS.map((l) => [l, 0]));
    for (const r of scoredRows) counts.set(r.result!.level, (counts.get(r.result!.level) ?? 0) + 1);
    return counts;
  }, [scoredRows]);

  const teamStats = useMemo(() => {
    const teams = Array.from(new Set(staffList.map((s) => s.team)));
    return teams.map((team) => {
      const teamRows = scoredRows.filter((r) => r.staff.team === team);
      const avg =
        teamRows.length > 0
          ? Math.round((teamRows.reduce((sum, r) => sum + r.result!.totalScore, 0) / teamRows.length) * 10) / 10
          : null;
      return { team, respondedCount: teamRows.length, totalCount: staffList.filter((s) => s.team === team).length, avg };
    });
  }, [scoredRows]);

  const selectedRow = selectedStaffId ? rows.find((r) => r.staff.id === selectedStaffId) : undefined;

  function handleStartNewRound() {
    if (!newRoundName.trim()) return;
    startNewRound(newRoundName.trim());
    setNewRoundName("");
    setShowNewRoundForm(false);
    setSelectedRoundId(null); // 새로 시작된 회차(활성 회차)를 보도록 초기화
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">보고 있는 회차</label>
          <select
            value={viewingRoundId ?? ""}
            onChange={(e) => setSelectedRoundId(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {sortedRounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.endDate ? `(마감 ${r.endDate})` : "(진행 중)"}
              </option>
            ))}
          </select>
        </div>

        {showNewRoundForm ? (
          <div className="flex items-center gap-2">
            <input
              value={newRoundName}
              onChange={(e) => setNewRoundName(e.target.value)}
              placeholder="예: 2차 진단"
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              onClick={handleStartNewRound}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              시작
            </button>
            <button
              onClick={() => setShowNewRoundForm(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewRoundForm(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            + 새 회차 시작
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">응시 대상</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{targetCount}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">응시 완료</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{completedCount}명</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">채점 대기</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingGradeCount}명</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">확정 완료</p>
          <p className="mt-2 text-2xl font-bold text-green-700">{confirmedCount}명</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">수준별 인원 분포</h3>
          {scoredRows.length === 0 ? (
            <p className="text-sm text-gray-400">아직 결과가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {LEVELS.map((level) => {
                const count = levelCounts.get(level) ?? 0;
                const width = scoredRows.length === 0 ? 0 : Math.max((count / scoredRows.length) * 100, count > 0 ? 4 : 0);
                return (
                  <div key={level} className="flex items-center gap-3 text-sm">
                    <span className="w-14 shrink-0 text-gray-600">{level}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${levelBarColor[level]}`} style={{ width: `${width}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right font-medium text-gray-900">{count}명</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">팀별 평균 점수</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="pb-2 font-medium">팀</th>
                <th className="pb-2 font-medium">응시</th>
                <th className="pb-2 font-medium">평균 점수</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map((t) => (
                <tr key={t.team} className="border-t border-gray-50">
                  <td className="py-1.5 text-gray-900">{t.team}</td>
                  <td className="py-1.5 text-gray-600">
                    {t.respondedCount}/{t.totalCount}명
                  </td>
                  <td className="py-1.5 font-medium text-gray-900">{t.avg != null ? `${t.avg}점` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">응시자 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">이름</th>
                <th className="px-4 py-2 font-medium">팀</th>
                <th className="px-4 py-2 font-medium">직급</th>
                <th className="px-4 py-2 font-medium">상태</th>
                <th className="px-4 py-2 font-medium">총점</th>
                <th className="px-4 py-2 font-medium">순위</th>
                <th className="px-4 py-2 font-medium">수준</th>
                <th className="px-4 py-2 font-medium">전 회차 대비</th>
                <th className="px-4 py-2 font-medium">신뢰도</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ staff, result, status, prevResult, reliabilityFlags }) => (
                <tr
                  key={staff.id}
                  onClick={() => result && setSelectedStaffId(staff.id)}
                  className={`border-b border-gray-50 last:border-0 ${result ? "cursor-pointer hover:bg-gray-50" : ""}`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">{staff.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{staff.team}</td>
                  <td className="px-4 py-2.5 text-gray-600">{staff.role}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyle[status]}`}>{status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{result ? `${result.totalScore}점` : "-"}</td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {result ? `${rankByStaffId.get(staff.id)}/${scoredRows.length}위` : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{result ? result.level : "-"}</td>
                  <td className="px-4 py-2.5">
                    {!result ? (
                      "-"
                    ) : !prevResult ? (
                      <span className="text-gray-300">이전 기록 없음</span>
                    ) : (
                      (() => {
                        const diff = Math.round((result.totalScore - prevResult.totalScore) * 10) / 10;
                        return (
                          <span className={diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500"}>
                            {diff > 0 ? "+" : ""}
                            {diff}점
                          </span>
                        );
                      })()
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {reliabilityFlags.length > 0 ? (
                      <span
                        title={reliabilityFlags.map((f) => f.label).join("\n")}
                        className="cursor-help rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700"
                      >
                        ⚠ 확인 필요
                      </span>
                    ) : result ? (
                      <span className="text-xs text-gray-300">-</span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRow?.result && (
        <ResultDetail
          title={`${selectedRow.staff.name} · ${selectedRow.staff.team}`}
          subtitle={`팀장: ${
            selectedRow.staff.managerId ? (staffById.get(selectedRow.staff.managerId)?.name ?? "-") : "-"
          }`}
          result={selectedRow.result}
          prevResult={selectedRow.prevResult}
          rank={rankByStaffId.get(selectedRow.staff.id) ?? null}
          totalRanked={scoredRows.length}
          reliabilityFlags={selectedRow.reliabilityFlags}
          confirmedBy={selectedRow.staff.managerId ?? ""}
          onConfirmAxis={(input) => confirmAxis({ ...input, axis: input.axis as AssessmentAxisId })}
          onClose={() => setSelectedStaffId(null)}
        />
      )}
    </div>
  );
}
