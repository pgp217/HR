"use client";

import { useMemo, useState } from "react";
import { useRecruit } from "./RecruitContext";
import { computeFitScore } from "@/lib/recruit-scoring";
import { toISODate, today } from "@/lib/date";
import CandidateDetailModal from "./CandidateDetailModal";
import InterviewScheduler from "./InterviewScheduler";
import type { Candidate, JobPosting } from "@/lib/recruit-types";

// 면접 대상자 목록: 전형 단계가 "면접"인 지원자만 인재 DB(RecruitContext)에서
// 그대로 끌어와 보여준다 — 이 탭만을 위한 별도 데이터는 두지 않는다.

function fitScoreStyle(score: number) {
  if (score >= 80) return "bg-green-50 text-green-700";
  if (score >= 60) return "bg-blue-50 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

// 희망 직무와 같은 공고 중, 모집중인 공고를 우선으로 보여준다(마감된 공고만
// 있으면 그거라도 보여주고, 아예 없으면 "-").
function matchedPosting(candidate: Candidate, postings: JobPosting[]): JobPosting | null {
  const matches = postings.filter((p) => p.role === candidate.desiredRole);
  if (matches.length === 0) return null;
  return matches.find((p) => p.status === "모집중") ?? matches[0];
}

export default function InterviewManager() {
  const { candidates, jobPostings } = useRecruit();
  const [detailCandidateId, setDetailCandidateId] = useState<string | null>(null);

  const todayISO = toISODate(today());

  const interviewCandidates = useMemo(
    () => candidates.filter((c) => c.stage === "면접"),
    [candidates]
  );

  const rows = useMemo(() => {
    return interviewCandidates
      .map((c) => ({
        candidate: c,
        score: computeFitScore(c, jobPostings),
        posting: matchedPosting(c, jobPostings),
      }))
      .sort((a, b) => (a.candidate.interviewAt ?? "").localeCompare(b.candidate.interviewAt ?? ""));
  }, [interviewCandidates, jobPostings]);

  const todayCount = interviewCandidates.filter(
    (c) => c.interviewAt && c.interviewAt.slice(0, 10) === todayISO
  ).length;

  const weekEndISO = toISODate(new Date(today().getTime() + 7 * 24 * 60 * 60 * 1000));
  const thisWeekCount = interviewCandidates.filter(
    (c) => c.interviewAt && c.interviewAt.slice(0, 10) >= todayISO && c.interviewAt.slice(0, 10) <= weekEndISO
  ).length;

  const unscheduledCount = interviewCandidates.filter((c) => !c.interviewAt).length;

  const detailCandidate = detailCandidateId
    ? candidates.find((c) => c.id === detailCandidateId)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">면접 관리</h2>
        <p className="text-sm text-gray-500">전형 단계가 &ldquo;면접&rdquo;인 지원자를 모아 관리합니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">면접 대상 인원</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{interviewCandidates.length}명</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">오늘 예정 면접</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{todayCount}명</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">이번 주 예정 면접</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{thisWeekCount}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">일정 미배정</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{unscheduledCount}명</p>
        </div>
      </div>

      <InterviewScheduler />

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">면접 대상자 목록</h3>
          <p className="text-xs text-gray-400">면접 일시가 이른 순으로 정렬됩니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">이름</th>
                <th className="px-4 py-2 font-medium">지원 공고명</th>
                <th className="px-4 py-2 font-medium">직무</th>
                <th className="px-4 py-2 font-medium">서류 점수</th>
                <th className="px-4 py-2 font-medium">지원일</th>
                <th className="px-4 py-2 font-medium">면접 일시</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    전형 단계가 &ldquo;면접&rdquo;인 지원자가 없습니다.
                  </td>
                </tr>
              )}
              {rows.map(({ candidate: c, score, posting }) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    <button onClick={() => setDetailCandidateId(c.id)} className="hover:underline">
                      {c.name}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{posting?.title ?? "-"}</td>
                  <td className="px-4 py-2.5 text-gray-700">{c.desiredRole || "-"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${fitScoreStyle(score.total)}`}
                    >
                      {score.total}점
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {c.interviewAt ? (
                      <span
                        className={
                          c.interviewAt.slice(0, 10) === todayISO ? "font-medium text-amber-700" : ""
                        }
                      >
                        {new Date(c.interviewAt).toLocaleString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-300">미배정</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailCandidate && (
        <CandidateDetailModal
          candidate={detailCandidate}
          jobPostings={jobPostings}
          onClose={() => setDetailCandidateId(null)}
        />
      )}
    </div>
  );
}
