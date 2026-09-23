"use client";

// 연차 사용 촉진 (근로기준법 제61조) 통합 테이블.
//   - 근속 1년 이상(1항, 회계연도 기준): 사용기간 만료 6개월 전 1차 촉구
//     → 10일 이내 근로자 응답 → 미응답 시 만료 2개월 전까지 2차 통보.
//   - 근속 1년 미만(2항, 입사일 기준): 최초 9개월 개근분(최대 9일 — 만료
//     3개월 전 1차/10일 이내 응답/만료 1개월 전 2차)과 10·11개월째 개근분
//     (최대 2일 — 만료 1개월 전 1차/5일 이내 응답/만료 10일 전 2차)의 두
//     촉구 사이클을 각각 돌린다.
// 두 그룹의 판정 로직(계산식)은 lib/leave-promotion.ts에 그대로 있고, 이
// 컴포넌트는 결과를 하나의 표로 병합·정렬해서 보여주기만 한다. 직원의
// 실제 근속(1년 이상/미만)에 따라 둘 중 하나의 규칙만 적용되므로 규칙이
// 겹쳐 중복 표시되는 일은 없다.
//
// 1년 미만자는 두 촉구 사이클(최초 9개월분 / 10·11개월째분)을 갖지만,
// 1년 이상자와 시각적으로 통일하기 위해 표에는 한 사람당 한 줄만 낸다.
// 두 사이클 중 더 급한 쪽(상태 우선순위: 2차대상 > 1차대상 >
// 근로자응답대기 > 완료/1차대기, 동순위면 마감일이 더 가까운 쪽)을 그
// 줄의 대표로 보여주고, 나머지 한 사이클을 포함한 전체 상세는 "상세"
// 버튼을 눌러 모달로 확인한다.

import { useMemo, useState } from "react";
import { useLeave } from "./LeaveContext";
import { CURRENT_YEAR } from "@/lib/mock-data";
import { formatKoreanDate, toISODate, today } from "@/lib/date";
import {
  getPromotionStage,
  getDeadlineInfo,
  getUnderOneYearBatchStage,
  getUnderOneYearBatchDeadlineInfo,
  UNDER_ONE_YEAR_BATCH_MAX_DAYS,
  type PromotionStage,
  type DeadlineInfo,
  type UnderOneYearBatchId,
} from "@/lib/leave-promotion";
import { tenureYearsAt } from "@/lib/leave-accrual";
import type { Staff } from "@/lib/types";

function formatRange(start?: string, end?: string): string {
  if (!start || !end) return "-";
  return start === end
    ? formatKoreanDate(start)
    : `${formatKoreanDate(start)} ~ ${formatKoreanDate(end)}`;
}

const todayISO = toISODate(today());

const stageStyles: Record<PromotionStage, string> = {
  대상아님: "bg-gray-50 text-gray-400",
  "1차대기": "bg-gray-50 text-gray-500",
  "1차대상": "bg-amber-50 text-amber-700",
  근로자응답대기: "bg-blue-50 text-blue-700",
  "2차대상": "bg-red-50 text-red-700",
  완료: "bg-green-50 text-green-700",
};

const stagePriority: Record<PromotionStage, number> = {
  "2차대상": 0,
  "1차대상": 1,
  근로자응답대기: 2,
  완료: 3,
  "1차대기": 4,
  대상아님: 5,
};

const batchCycleLabel: Record<UnderOneYearBatchId, string> = {
  A: "최초 9개월분",
  B: "10·11개월째분",
};

interface NoticeFields {
  stage: PromotionStage;
  deadline: DeadlineInfo | null;
  firstNoticeAt?: string;
  employeeSpecifiedAt?: string;
  employeeSpecifiedStart?: string;
  employeeSpecifiedEnd?: string;
  secondNoticeAt?: string;
  secondNoticeStart?: string;
  secondNoticeEnd?: string;
}

interface BatchDetail extends NoticeFields {
  batch: UnderOneYearBatchId;
}

interface MergedRow extends NoticeFields {
  key: string;
  staff: Staff;
  remaining: number;
  representativeBatch?: UnderOneYearBatchId; // 1년 이상자 행이면 undefined
  batchDetails?: BatchDetail[]; // 1년 미만자 행에서만 채워짐(상세 모달용)
}

// 더 급한 쪽을 고른다: 상태 우선순위가 낮을수록(= stagePriority 숫자가
// 작을수록) 급하고, 우선순위가 같으면 마감일이 더 가까운(daysLeft가
// 더 작은) 쪽이 급하다.
function pickMoreUrgent(a: BatchDetail, b: BatchDetail): BatchDetail {
  const pa = stagePriority[a.stage];
  const pb = stagePriority[b.stage];
  if (pa !== pb) return pa < pb ? a : b;
  if (a.deadline && b.deadline) return a.deadline.daysLeft <= b.deadline.daysLeft ? a : b;
  if (a.deadline) return a;
  if (b.deadline) return b;
  return a;
}

export default function LeavePromotionPanel() {
  const {
    staffList,
    remainingDaysByStaff,
    promotionNotices,
    sendFirstNotice,
    recordEmployeeResponse,
    sendSecondNotice,
    sendBatchFirstNotice,
    recordBatchEmployeeResponse,
    sendBatchSecondNotice,
  } = useLeave();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [draftError, setDraftError] = useState("");
  const [detailStaffId, setDetailStaffId] = useState<string | null>(null);

  const noticeByStaffId = useMemo(
    () => new Map(promotionNotices.map((n) => [n.staffId, n])),
    [promotionNotices]
  );

  const rows = useMemo(() => {
    const list: MergedRow[] = [];
    for (const staff of staffList) {
      const notice = noticeByStaffId.get(staff.id);
      const remaining = remainingDaysByStaff.get(staff.id) ?? 0;

      if (tenureYearsAt(staff.joinedAt, todayISO) >= 1) {
        const stage = getPromotionStage(todayISO, CURRENT_YEAR, remaining, notice);
        if (stage === "대상아님") continue;
        list.push({
          key: staff.id,
          staff,
          remaining,
          stage,
          deadline: getDeadlineInfo(todayISO, CURRENT_YEAR, stage, notice),
          firstNoticeAt: notice?.firstNoticeAt,
          employeeSpecifiedAt: notice?.employeeSpecifiedAt,
          employeeSpecifiedStart: notice?.employeeSpecifiedStart,
          employeeSpecifiedEnd: notice?.employeeSpecifiedEnd,
          secondNoticeAt: notice?.secondNoticeAt,
          secondNoticeStart: notice?.secondNoticeStart,
          secondNoticeEnd: notice?.secondNoticeEnd,
        });
        continue;
      }

      const batchDetails: BatchDetail[] = (["A", "B"] as const).map((batch) => {
        const batchNotice = batch === "A" ? notice?.underOneYearBatchA : notice?.underOneYearBatchB;
        const stage = getUnderOneYearBatchStage(todayISO, staff.joinedAt, batch, batchNotice);
        return {
          batch,
          stage,
          deadline: getUnderOneYearBatchDeadlineInfo(todayISO, staff.joinedAt, batch, stage, batchNotice),
          firstNoticeAt: batchNotice?.firstNoticeAt,
          employeeSpecifiedAt: batchNotice?.employeeSpecifiedAt,
          employeeSpecifiedStart: batchNotice?.employeeSpecifiedStart,
          employeeSpecifiedEnd: batchNotice?.employeeSpecifiedEnd,
          secondNoticeAt: batchNotice?.secondNoticeAt,
          secondNoticeStart: batchNotice?.secondNoticeStart,
          secondNoticeEnd: batchNotice?.secondNoticeEnd,
        };
      });
      const rep = pickMoreUrgent(batchDetails[0], batchDetails[1]);

      list.push({
        key: staff.id,
        staff,
        remaining,
        representativeBatch: rep.batch,
        batchDetails,
        stage: rep.stage,
        deadline: rep.deadline,
        firstNoticeAt: rep.firstNoticeAt,
        employeeSpecifiedAt: rep.employeeSpecifiedAt,
        employeeSpecifiedStart: rep.employeeSpecifiedStart,
        employeeSpecifiedEnd: rep.employeeSpecifiedEnd,
        secondNoticeAt: rep.secondNoticeAt,
        secondNoticeStart: rep.secondNoticeStart,
        secondNoticeEnd: rep.secondNoticeEnd,
      });
    }

    return list.sort((a, b) => {
      const aHasDeadline = a.deadline !== null;
      const bHasDeadline = b.deadline !== null;
      if (aHasDeadline && bHasDeadline) return a.deadline!.daysLeft - b.deadline!.daysLeft;
      if (aHasDeadline !== bHasDeadline) return aHasDeadline ? -1 : 1;
      return stagePriority[a.stage] - stagePriority[b.stage];
    });
  }, [staffList, remainingDaysByStaff, noticeByStaffId]);

  const actionNeededCount = rows.filter(
    (r) => r.stage === "1차대상" || r.stage === "2차대상"
  ).length;

  const detailRow = detailStaffId ? rows.find((r) => r.staff.id === detailStaffId) : undefined;

  function startEditing(key: string) {
    setEditingKey(key);
    setDraftStart("");
    setDraftEnd("");
    setDraftError("");
  }

  function validateDraft(): boolean {
    if (!draftStart || !draftEnd) {
      setDraftError("시작일과 종료일을 모두 입력해주세요.");
      return false;
    }
    if (draftEnd < draftStart) {
      setDraftError("종료일은 시작일보다 빠를 수 없습니다.");
      return false;
    }
    return true;
  }

  function sendFirst(row: MergedRow) {
    if (row.representativeBatch) sendBatchFirstNotice(row.staff.id, row.representativeBatch);
    else sendFirstNotice(row.staff.id);
  }

  function submitResponse(row: MergedRow) {
    if (!validateDraft()) return;
    if (row.representativeBatch) {
      recordBatchEmployeeResponse(row.staff.id, row.representativeBatch, draftStart, draftEnd);
    } else {
      recordEmployeeResponse(row.staff.id, draftStart, draftEnd);
    }
    setEditingKey(null);
  }

  function submitSecondNotice(row: MergedRow) {
    if (!validateDraft()) return;
    if (row.representativeBatch) {
      sendBatchSecondNotice(row.staff.id, row.representativeBatch, draftStart, draftEnd);
    } else {
      sendSecondNotice(row.staff.id, draftStart, draftEnd);
    }
    setEditingKey(null);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">연차 사용 촉진</h3>
        {actionNeededCount > 0 && (
          <span className="rounded bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            조치 필요 {actionNeededCount}건
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-medium">직원</th>
              <th className="px-4 py-2 font-medium">역할</th>
              <th className="px-4 py-2 font-medium">잔여 연차</th>
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">1차 촉구일</th>
              <th className="px-4 py-2 font-medium">근로자 응답</th>
              <th className="px-4 py-2 font-medium">2차 통보</th>
              <th className="px-4 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  촉진 대상 직원이 없습니다.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const { staff, remaining, stage, deadline } = row;
              const isEditing = editingKey === row.key;
              return (
                <tr key={row.key} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    <div className="flex items-center gap-1.5">
                      <span>{staff.name}</span>
                      {row.batchDetails && (
                        <button
                          onClick={() => setDetailStaffId(staff.id)}
                          title="두 촉구 사이클 상세보기"
                          className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-normal text-gray-500 hover:bg-gray-50"
                        >
                          상세
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{staff.role}</td>
                  <td className="px-4 py-2.5 text-gray-700">{remaining}일</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${stageStyles[stage]}`}>
                        {stage}
                      </span>
                      {deadline && (
                        <span
                          className={`text-xs font-medium ${
                            deadline.urgent ? "text-red-600" : "text-gray-400"
                          }`}
                        >
                          {deadline.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {row.firstNoticeAt ? formatKoreanDate(row.firstNoticeAt) : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {row.employeeSpecifiedAt ? (
                      <span title={`통보일: ${formatKoreanDate(row.employeeSpecifiedAt)}`}>
                        {formatRange(row.employeeSpecifiedStart, row.employeeSpecifiedEnd)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {row.secondNoticeAt ? (
                      <span title={`통보일: ${formatKoreanDate(row.secondNoticeAt)}`}>
                        {formatRange(row.secondNoticeStart, row.secondNoticeEnd)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {stage === "1차대상" && (
                      <button
                        onClick={() => sendFirst(row)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        1차 촉구 발송
                      </button>
                    )}
                    {stage === "근로자응답대기" &&
                      (isEditing ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="date"
                              value={draftStart}
                              onChange={(e) => setDraftStart(e.target.value)}
                              className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                            />
                            <span className="text-gray-400">~</span>
                            <input
                              type="date"
                              value={draftEnd}
                              onChange={(e) => setDraftEnd(e.target.value)}
                              className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                            />
                            <button
                              onClick={() => submitResponse(row)}
                              className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              취소
                            </button>
                          </div>
                          {draftError && <p className="text-[11px] text-red-600">{draftError}</p>}
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(row.key)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          근로자 응답 기록
                        </button>
                      ))}
                    {stage === "2차대상" &&
                      (isEditing ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="date"
                              value={draftStart}
                              onChange={(e) => setDraftStart(e.target.value)}
                              className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                            />
                            <span className="text-gray-400">~</span>
                            <input
                              type="date"
                              value={draftEnd}
                              onChange={(e) => setDraftEnd(e.target.value)}
                              className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                            />
                            <button
                              onClick={() => submitSecondNotice(row)}
                              className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-red-700"
                            >
                              발송
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              취소
                            </button>
                          </div>
                          {draftError && <p className="text-[11px] text-red-600">{draftError}</p>}
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(row.key)}
                          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          2차 통보 발송
                        </button>
                      ))}
                    {(stage === "완료" || stage === "1차대기") && (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailRow?.batchDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setDetailStaffId(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {detailRow.staff.name} — 촉구 사이클 상세
              </h4>
              <button
                onClick={() => setDetailStaffId(null)}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                닫기
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {detailRow.batchDetails.map((d) => (
                <div key={d.batch} className="px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">
                      {batchCycleLabel[d.batch]} (대상 연차 {UNDER_ONE_YEAR_BATCH_MAX_DAYS[d.batch]}일)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${stageStyles[d.stage]}`}>
                        {d.stage}
                      </span>
                      {d.deadline && (
                        <span
                          className={`text-xs font-medium ${
                            d.deadline.urgent ? "text-red-600" : "text-gray-400"
                          }`}
                        >
                          {d.deadline.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-gray-400">1차 촉구일</dt>
                      <dd className="text-gray-700">
                        {d.firstNoticeAt ? formatKoreanDate(d.firstNoticeAt) : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">근로자 응답</dt>
                      <dd className="text-gray-700">
                        {formatRange(d.employeeSpecifiedStart, d.employeeSpecifiedEnd)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">2차 통보</dt>
                      <dd className="text-gray-700">
                        {formatRange(d.secondNoticeStart, d.secondNoticeEnd)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
