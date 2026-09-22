"use client";

import { useMemo, useState } from "react";
import { useRecruit } from "./RecruitContext";
import { DESIRED_ROLES } from "@/lib/recruit-options";
import type { RecruitStage } from "@/lib/recruit-types";
import { toISODate, today } from "@/lib/date";
import { computeFitScore, FIT_SCORE_MAX, FAIL_THRESHOLD } from "@/lib/recruit-scoring";

const STAGES: RecruitStage[] = ["서류", "면접", "최종", "합격", "불합격"];

const stageStyles: Record<RecruitStage, string> = {
  서류: "bg-gray-50 text-gray-700",
  면접: "bg-amber-50 text-amber-700",
  최종: "bg-blue-50 text-blue-700",
  합격: "bg-green-50 text-green-700",
  불합격: "bg-red-50 text-red-700",
};

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max === 0 ? 0 : Math.max((count / max) * 100, count > 0 ? 4 : 0);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-gray-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-medium text-gray-900">{count}</span>
    </div>
  );
}

function fitScoreStyle(score: number) {
  if (score >= 80) return "bg-green-50 text-green-700";
  if (score >= 60) return "bg-blue-50 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

export default function RecruitDashboard() {
  const { candidates, jobPostings, updateCandidateStage } = useRecruit();
  const [sortByScore, setSortByScore] = useState<"desc" | "asc" | null>(null);

  const todayISO = toISODate(today());
  const weekAgoISO = toISODate(new Date(today().getTime() - 7 * 24 * 60 * 60 * 1000));

  const stageCounts = useMemo(() => {
    const map = new Map<RecruitStage, number>(STAGES.map((s) => [s, 0]));
    for (const c of candidates) map.set(c.stage, (map.get(c.stage) ?? 0) + 1);
    return map;
  }, [candidates]);

  const postingCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of jobPostings) {
      map.set(
        p.id,
        candidates.filter((c) => c.desiredRole === p.role).length
      );
    }
    return map;
  }, [candidates, jobPostings]);

  const roleCounts = useMemo(() => {
    const map = new Map<string, number>(DESIRED_ROLES.map((r) => [r, 0]));
    for (const c of candidates) {
      if (c.desiredRole) map.set(c.desiredRole, (map.get(c.desiredRole) ?? 0) + 1);
    }
    return map;
  }, [candidates]);

  const todayInterviews = useMemo(
    () => candidates.filter((c) => c.interviewAt && c.interviewAt.slice(0, 10) === todayISO),
    [candidates, todayISO]
  );

  const closingSoonPostings = useMemo(
    () =>
      jobPostings
        .filter((p) => p.status === "모집중" && p.deadline >= todayISO)
        .sort((a, b) => (a.deadline < b.deadline ? -1 : 1))
        .filter((p) => {
          const days = Math.round(
            (new Date(p.deadline).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24)
          );
          return days <= 7;
        }),
    [jobPostings, todayISO]
  );

  const newThisWeekCount = useMemo(
    () => candidates.filter((c) => c.createdAt.slice(0, 10) >= weekAgoISO).length,
    [candidates, weekAgoISO]
  );

  const scoredCandidates = useMemo(() => {
    const scored = candidates.map((c) => ({ candidate: c, score: computeFitScore(c, jobPostings) }));
    if (!sortByScore) return scored;
    return [...scored].sort((a, b) =>
      sortByScore === "desc" ? b.score.total - a.score.total : a.score.total - b.score.total
    );
  }, [candidates, jobPostings, sortByScore]);

  function toggleScoreSort() {
    setSortByScore((prev) => (prev === "desc" ? "asc" : prev === "asc" ? null : "desc"));
  }

  const maxStageCount = Math.max(1, ...Array.from(stageCounts.values()));
  const maxPostingCount = Math.max(1, ...Array.from(postingCounts.values()));
  const maxRoleCount = Math.max(1, ...Array.from(roleCounts.values()));

  function daysUntil(dateISO: string) {
    return Math.round(
      (new Date(dateISO).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">채용 대시보드</h2>
        <p className="text-sm text-gray-500">등록된 지원자 현황을 한눈에 확인합니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">총 지원자</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{candidates.length}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">이번 주 신규 지원</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{newThisWeekCount}명</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">오늘 예정 면접</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{todayInterviews.length}명</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">마감 임박 공고</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{closingSoonPostings.length}건</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">전형 단계별 인원</h3>
        <div className="flex flex-col gap-2">
          {STAGES.map((s) => (
            <BarRow key={s} label={s} count={stageCounts.get(s) ?? 0} max={maxStageCount} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">채용 공고별 지원자 수</h3>
          <div className="flex flex-col gap-2">
            {jobPostings.map((p) => (
              <BarRow
                key={p.id}
                label={p.title.replace(" 채용", "")}
                count={postingCounts.get(p.id) ?? 0}
                max={maxPostingCount}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            지원자의 희망 직무가 공고 대상 직무와 일치하는 건수로 집계됩니다.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">직무별 지원자 수</h3>
          <div className="flex flex-col gap-2">
            {DESIRED_ROLES.map((role) => (
              <BarRow key={role} label={role} count={roleCounts.get(role) ?? 0} max={maxRoleCount} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">오늘 예정된 면접</h3>
          {todayInterviews.length === 0 ? (
            <p className="text-sm text-gray-400">오늘 예정된 면접이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayInterviews.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-900">
                    {c.name} · {c.desiredRole || "직무 미기재"}
                  </span>
                  <span className="text-amber-700">
                    {c.interviewAt &&
                      new Date(c.interviewAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">마감 임박 공고</h3>
          {closingSoonPostings.length === 0 ? (
            <p className="text-sm text-gray-400">7일 이내 마감되는 공고가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {closingSoonPostings.map((p) => {
                const days = daysUntil(p.deadline);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-900">{p.title}</span>
                    <span className="text-red-600">
                      {days === 0 ? "오늘 마감" : `D-${days}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">지원자 목록 · 전형 관리</h3>
          <p className="text-xs text-gray-400">
            적합도 점수 = 경력 20 + 역량 레벨 30 + 희망 직무 적합도 50 · {FAIL_THRESHOLD}점 미만 &ldquo;탈락 대상&rdquo; 표시
          </p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-medium">이름</th>
              <th className="px-4 py-2 font-medium">희망 직무</th>
              <th className="px-4 py-2 font-medium">지원일</th>
              <th className="px-4 py-2 font-medium">전형 단계</th>
              <th className="px-4 py-2 font-medium">면접 일시</th>
              <th className="px-4 py-2 font-medium">
                <button
                  onClick={toggleScoreSort}
                  className="flex items-center gap-1 font-medium text-gray-500 hover:text-gray-800"
                >
                  적합도 점수
                  <span className="text-gray-300">
                    {sortByScore === "desc" ? "▼" : sortByScore === "asc" ? "▲" : "↕"}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {scoredCandidates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  등록된 지원자가 없습니다.
                </td>
              </tr>
            )}
            {scoredCandidates.map(({ candidate: c, score }) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  <div className="flex items-center gap-1.5">
                    {c.name}
                    {score.total < FAIL_THRESHOLD && (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                        탈락 대상
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-700">{c.desiredRole || "-"}</td>
                <td className="px-4 py-2.5 text-gray-500">
                  {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={c.stage}
                    onChange={(e) =>
                      updateCandidateStage(c.id, e.target.value as RecruitStage, c.interviewAt)
                    }
                    className={`rounded px-2 py-1 text-xs font-medium ${stageStyles[c.stage]}`}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  {c.stage === "면접" ? (
                    <input
                      type="datetime-local"
                      value={c.interviewAt ?? ""}
                      onChange={(e) => updateCandidateStage(c.id, c.stage, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    title={`경력 ${score.experience}/${FIT_SCORE_MAX.experience} · 즉시투입 ${score.availability}/${FIT_SCORE_MAX.availability} · 어학 ${score.english}/${FIT_SCORE_MAX.english} · 엑셀 ${score.excel}/${FIT_SCORE_MAX.excel} · 직무매칭 ${score.roleMatch}/${FIT_SCORE_MAX.roleMatch}`}
                    className={`inline-block cursor-help rounded px-2 py-0.5 text-xs font-semibold ${fitScoreStyle(score.total)}`}
                  >
                    {score.total}점
                  </span>
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
