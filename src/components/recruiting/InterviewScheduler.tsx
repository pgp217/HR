"use client";

import { useMemo, useState } from "react";
import { staffList } from "@/lib/mock-data";
import { useRecruit } from "./RecruitContext";
import {
  EXTERNAL_INTERVIEWERS,
  computeScheduleSummary,
  formatMinutes,
} from "@/lib/interview-scheduling";
import { formatKoreanDate } from "@/lib/date";

const INTERNAL_ROLES = new Set(["차장", "부장"]);

export default function InterviewScheduler() {
  const { candidates, interviewAssignments, runAutoAssign } = useRecruit();

  const internalCandidates = useMemo(
    () => staffList.filter((s) => INTERNAL_ROLES.has(s.role)),
    []
  );

  const [selectedInternal, setSelectedInternal] = useState<string[]>([]);
  const [selectedExternal, setSelectedExternal] = useState<string[]>([]);

  const targetCandidates = useMemo(() => candidates.filter((c) => c.stage === "면접"), [candidates]);
  const targetCount = targetCandidates.length;
  const panelCount = Math.min(selectedInternal.length, selectedExternal.length);
  const summary = computeScheduleSummary(targetCount, panelCount);

  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  // 이 표는 "지금 배정된 일정"을 보여주는 영역이므로, 이미 최종/합격/불합격으로
  // 넘어간 지원자의 과거 면접 이력(면접관 편향 체크용으로 별도 보관)은
  // 제외하고 현재 "면접" 단계인 지원자만 보여준다.
  const sortedAssignments = useMemo(
    () =>
      interviewAssignments
        .filter((a) => candidateById.get(a.candidateId)?.stage === "면접")
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    [interviewAssignments, candidateById]
  );

  function toggle(list: string[], setList: (v: string[]) => void, name: string) {
    setList(list.includes(name) ? list.filter((n) => n !== name) : [...list, name]);
  }

  const canRun = targetCount > 0 && panelCount > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">AI 기반 일정 자동 배정</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          패널 1개 = 내부 면접관(차장~부장) 1명 + 외부 면접관 1명. 면접 방식: 대면(고정), 슬롯 20분
          면접 + 10분 채점 = 30분.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">내부 면접관 선택 (차장~부장)</p>
          <div className="flex flex-col gap-1.5">
            {internalCandidates.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedInternal.includes(s.name)}
                  onChange={() => toggle(selectedInternal, setSelectedInternal, s.name)}
                />
                {s.name} ({s.role})
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">외부 면접관 선택</p>
          <div className="flex flex-col gap-1.5">
            {EXTERNAL_INTERVIEWERS.map((name) => (
              <label key={name} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedExternal.includes(name)}
                  onChange={() => toggle(selectedExternal, setSelectedExternal, name)}
                />
                {name}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-400">
          {selectedInternal.length !== selectedExternal.length && selectedInternal.length > 0 && selectedExternal.length > 0
            ? `내부 ${selectedInternal.length}명 · 외부 ${selectedExternal.length}명 선택됨 — 적은 쪽 기준으로 ${panelCount}개 패널만 구성됩니다.`
            : `패널 ${panelCount}개로 구성됩니다.`}
        </p>
        <button
          onClick={() => runAutoAssign(selectedInternal, selectedExternal)}
          disabled={!canRun}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          자동 배정 실행
        </button>
      </div>

      {targetCount === 0 ? (
        <p className="border-t border-gray-100 px-4 py-6 text-center text-sm text-gray-400">
          면접 단계인 지원자가 없어 배정할 대상이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 px-4 py-4 md:grid-cols-5">
          <div>
            <p className="text-xs text-gray-500">면접 대상 인원</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{summary.targetCount}명</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">패널 수</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{summary.panelCount}개</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">패널당 처리 인원</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{summary.perPanelCount || "-"}명</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">총 소요 시간</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {summary.totalMinutes ? formatMinutes(summary.totalMinutes) : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">필요 일수</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{summary.daysNeeded || "-"}일</p>
          </div>
        </div>
      )}

      {sortedAssignments.length > 0 && (
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">지원자</th>
                <th className="px-4 py-2 font-medium">패널</th>
                <th className="px-4 py-2 font-medium">내부 면접관</th>
                <th className="px-4 py-2 font-medium">외부 면접관</th>
                <th className="px-4 py-2 font-medium">회의실</th>
                <th className="px-4 py-2 font-medium">일시</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssignments.map((a) => (
                <tr key={a.candidateId} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {candidateById.get(a.candidateId)?.name ?? "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{a.panelId}</td>
                  <td className="px-4 py-2.5 text-gray-700">{a.internalInterviewer}</td>
                  <td className="px-4 py-2.5 text-gray-700">{a.externalInterviewer}</td>
                  <td className="px-4 py-2.5 text-gray-500">{a.room}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {formatKoreanDate(a.date)} {a.startTime}~{a.endTime}
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
