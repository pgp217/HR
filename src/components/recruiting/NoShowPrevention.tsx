"use client";

import { useMemo, useState } from "react";
import { useRecruit } from "./RecruitContext";
import { toISODate, today, formatKoreanDate } from "@/lib/date";
import { computeFitScore } from "@/lib/recruit-scoring";
import { getNoticeStage, getDeadlineInfo, type NoticeStage } from "@/lib/interview-noshow";

const stageStyles: Record<NoticeStage, string> = {
  예정: "bg-gray-50 text-gray-400",
  "D-3대상": "bg-amber-50 text-amber-700",
  대기: "bg-gray-50 text-gray-500",
  "D-1대상": "bg-amber-50 text-amber-700",
  노쇼위험: "bg-red-50 text-red-700",
  응답완료: "bg-green-50 text-green-700",
};

const stagePriority: Record<NoticeStage, number> = {
  노쇼위험: 0,
  "D-1대상": 1,
  "D-3대상": 2,
  대기: 3,
  응답완료: 4,
  예정: 5,
};

const WAITLIST_SIZE = 5;

export default function NoShowPrevention() {
  const {
    candidates,
    jobPostings,
    interviewAssignments,
    interviewNotices,
    sendD3Notice,
    sendD1Notice,
    recordNoticeResponse,
    markNoShowAndReshuffle,
    reassignFromWaitlist,
  } = useRecruit();

  const [pickerForCandidateId, setPickerForCandidateId] = useState<string | null>(null);

  const todayISO = toISODate(today());
  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const noticeByCandidateId = useMemo(
    () => new Map(interviewNotices.map((n) => [n.candidateId, n])),
    [interviewNotices]
  );

  const rows = useMemo(() => {
    return interviewAssignments
      .map((a) => {
        const candidate = candidateById.get(a.candidateId);
        // 전형 단계가 이미 "면접"을 지난(최종/합격/불합격) 과거 면접 이력은
        // 노쇼 방지 대상이 아니다 — 이미 다 끝난 일정이라 D-day 배지가
        // 의미 없어진다. 지금 응답 대기 중인 "면접" 단계만 보여준다.
        if (!candidate || candidate.stage !== "면접") return null;
        const notice = noticeByCandidateId.get(a.candidateId);
        const stage = getNoticeStage(todayISO, a.date, notice);
        const deadline = getDeadlineInfo(todayISO, a.date);
        return { assignment: a, candidate, notice, stage, deadline };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => {
        const p = stagePriority[a.stage] - stagePriority[b.stage];
        if (p !== 0) return p;
        return a.deadline.daysLeft - b.deadline.daysLeft;
      });
  }, [interviewAssignments, candidateById, noticeByCandidateId, todayISO]);

  const riskCount = rows.filter((r) => r.stage === "노쇼위험").length;

  // 대기명단: "서류" 단계이고 아직 이번 일정에 배정되지 않은 지원자 중
  // 적합도 점수가 높은 순 상위 5명. 별도 더미 데이터가 아니라 인재 DB에서
  // 그대로 뽑는다.
  const waitlist = useMemo(() => {
    const scheduledIds = new Set(interviewAssignments.map((a) => a.candidateId));
    return candidates
      .filter((c) => c.stage === "서류" && !scheduledIds.has(c.id))
      .map((c) => ({ candidate: c, score: computeFitScore(c, jobPostings).total }))
      .sort((a, b) => b.score - a.score)
      .slice(0, WAITLIST_SIZE);
  }, [candidates, jobPostings, interviewAssignments]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">노쇼 방지 알림</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            면접 3일 전 안내, 1일 전 리마인드와 응답 확인을 관리합니다.
          </p>
        </div>
        {riskCount > 0 && (
          <span className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
            노쇼 위험 {riskCount}건
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-medium">지원자</th>
              <th className="px-4 py-2 font-medium">면접 일시</th>
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">D-3 발송</th>
              <th className="px-4 py-2 font-medium">D-1 발송</th>
              <th className="px-4 py-2 font-medium">응답</th>
              <th className="px-4 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  일정이 배정된 면접이 없습니다. 위 &ldquo;AI 기반 일정 자동 배정&rdquo;을 먼저 실행해주세요.
                </td>
              </tr>
            )}
            {rows.map(({ assignment: a, candidate: c, notice, stage, deadline }) => {
              const isPicking = pickerForCandidateId === c.id;
              return (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {formatKoreanDate(a.date)} {a.startTime}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${stageStyles[stage]}`}>
                        {stage}
                      </span>
                      <span
                        className={`text-xs font-medium ${deadline.urgent ? "text-red-600" : "text-gray-400"}`}
                      >
                        {deadline.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {notice?.d3SentAt ? new Date(notice.d3SentAt).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {notice?.d1SentAt ? new Date(notice.d1SentAt).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {notice?.respondedAt ? "응답함" : "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {stage === "D-3대상" && (
                        <button
                          onClick={() => sendD3Notice(c.id)}
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          D-3 발송
                        </button>
                      )}
                      {stage === "D-1대상" && (
                        <button
                          onClick={() => sendD1Notice(c.id)}
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          D-1 발송
                        </button>
                      )}
                      {stage === "노쇼위험" && !isPicking && (
                        <>
                          <button
                            onClick={() => recordNoticeResponse(c.id)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            응답 확인
                          </button>
                          <button
                            onClick={() => setPickerForCandidateId(c.id)}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            대기명단 재배정
                          </button>
                        </>
                      )}
                      {stage === "노쇼위험" && isPicking && (
                        <div className="flex flex-col gap-1">
                          {waitlist.length === 0 ? (
                            <span className="text-xs text-gray-400">대기명단 후보 없음</span>
                          ) : (
                            <select
                              autoFocus
                              defaultValue=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                reassignFromWaitlist(c.id, e.target.value);
                                setPickerForCandidateId(null);
                              }}
                              className="rounded border border-gray-300 px-1.5 py-1 text-xs"
                            >
                              <option value="" disabled>
                                대기명단에서 선택...
                              </option>
                              {waitlist.map((w) => (
                                <option key={w.candidate.id} value={w.candidate.id}>
                                  {w.candidate.name} ({w.score}점)
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => setPickerForCandidateId(null)}
                            className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            취소
                          </button>
                        </div>
                      )}
                      {a.date === todayISO && (
                        <button
                          onClick={() => markNoShowAndReshuffle(c.id)}
                          title="오늘 나타나지 않은 경우 결석 처리하고 뒤 순번을 당겨 배정합니다."
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50"
                        >
                          결석 처리(당겨 배정)
                        </button>
                      )}
                      {(stage === "예정" || stage === "대기" || stage === "응답완료") &&
                        a.date !== todayISO && <span className="text-xs text-gray-300">-</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-gray-500">
          대기명단(waitlist) — 서류 단계 중 적합도 점수 상위 {WAITLIST_SIZE}명
        </p>
        {waitlist.length === 0 ? (
          <p className="text-xs text-gray-400">대기명단으로 쓸 수 있는 서류 단계 지원자가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {waitlist.map((w) => (
              <span
                key={w.candidate.id}
                className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-600"
              >
                {w.candidate.name} · {w.score}점
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
