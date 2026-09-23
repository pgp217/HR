"use client";

import { useState } from "react";
import type { LeaveRequest, LeaveStatus, Staff } from "@/lib/types";
import { formatKoreanDate, toISODate, today } from "@/lib/date";
import { formatLeaveTypeLabel } from "@/lib/leave-display";
import { compareStaffSeniority } from "@/lib/staff-order";

interface Props {
  requests: LeaveRequest[];
  staffById: Map<string, Staff>;
  onDecision: (id: string, status: LeaveStatus) => void;
  onDelete: (id: string) => void;
  onUpdateReason: (id: string, reason: string) => void;
}

const filters: (LeaveStatus | "전체")[] = ["전체", "승인대기", "승인", "반려"];

const statusStyles: Record<LeaveStatus, string> = {
  승인대기: "bg-amber-50 text-amber-700",
  승인: "bg-green-50 text-green-700",
  반려: "bg-red-50 text-red-700",
};

const todayISO = toISODate(today());

// 오늘로부터 며칠 떨어져 있는지(과거는 음수)를 구한다 — "전체(오늘 순)"
// 모드에서 이 값의 절댓값이 작은 순으로 정렬해 오늘이 항상 맨 위로
// 오게 한다.
function dayDistanceFromToday(dateISO: string): number {
  return Math.round((new Date(dateISO).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24));
}

export default function RequestList({
  requests,
  staffById,
  onDecision,
  onDelete,
  onUpdateReason,
}: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("승인대기");
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null);
  const [draftReason, setDraftReason] = useState("");

  const now = today();
  const [viewMode, setViewMode] = useState<"all" | "month">("all");
  const [navYear, setNavYear] = useState(now.getFullYear());
  const [navMonth, setNavMonth] = useState(now.getMonth());

  function goToPrevMonth() {
    if (navMonth === 0) {
      setNavYear((y) => y - 1);
      setNavMonth(11);
    } else {
      setNavMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (navMonth === 11) {
      setNavYear((y) => y + 1);
      setNavMonth(0);
    } else {
      setNavMonth((m) => m + 1);
    }
  }

  function seniorityCompare(a: LeaveRequest, b: LeaveRequest): number {
    const staffA = staffById.get(a.staffId);
    const staffB = staffById.get(b.staffId);
    if (staffA && staffB) {
      const cmp = compareStaffSeniority(staffA, staffB);
      if (cmp !== 0) return cmp;
    }
    return a.requestedAt < b.requestedAt ? 1 : -1;
  }

  const filtered = requests
    .filter((r) => (filter === "전체" ? true : r.status === filter))
    .filter((r) => {
      if (viewMode !== "month") return true;
      const [y, m] = r.startDate.split("-").map(Number);
      return y === navYear && m === navMonth + 1;
    })
    .sort((a, b) => {
      if (viewMode === "month") {
        if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
        return seniorityCompare(a, b);
      }
      const da = Math.abs(dayDistanceFromToday(a.startDate));
      const db = Math.abs(dayDistanceFromToday(b.startDate));
      if (da !== db) return da - db;
      return seniorityCompare(a, b);
    });

  function handleDeleteClick(req: LeaveRequest, staffName: string) {
    const confirmed = window.confirm(
      `${staffName}님의 ${req.type} 신청(${formatKoreanDate(req.startDate)})을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
    );
    if (confirmed) onDelete(req.id);
  }

  function startEditingReason(req: LeaveRequest) {
    setEditingReasonId(req.id);
    setDraftReason("");
  }

  function saveReason(id: string) {
    onUpdateReason(id, draftReason.trim() || "-");
    setEditingReasonId(null);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">휴가 신청 목록</h3>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              viewMode === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            전체 (오늘 순)
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              viewMode === "month"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            월별 보기
          </button>
        </div>
        {viewMode === "month" && (
          <div className="flex items-center gap-2 text-sm">
            <button onClick={goToPrevMonth} className="rounded px-2 py-1 hover:bg-gray-100">
              ‹
            </button>
            <span className="w-20 text-center font-medium text-gray-700">
              {navYear}년 {navMonth + 1}월
            </span>
            <button onClick={goToNextMonth} className="rounded px-2 py-1 hover:bg-gray-100">
              ›
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
            <th className="px-4 py-2 font-medium">직원</th>
            <th className="px-4 py-2 font-medium">종류</th>
            <th className="px-4 py-2 font-medium">기간</th>
            <th className="px-4 py-2 font-medium">일수</th>
            <th className="px-4 py-2 font-medium">사유</th>
            <th className="px-4 py-2 font-medium">인수인계</th>
            <th className="px-4 py-2 font-medium">신청일</th>
            <th className="px-4 py-2 font-medium">상태</th>
            <th className="px-4 py-2 font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                해당하는 신청 내역이 없습니다.
              </td>
            </tr>
          )}
          {filtered.map((req) => {
            const staff = staffById.get(req.staffId);
            const sameDay = req.startDate === req.endDate;
            return (
              <tr key={req.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-900">{staff?.name ?? "-"}</td>
                <td className="px-4 py-2.5 text-gray-700">{formatLeaveTypeLabel(req.type)}</td>
                <td className="px-4 py-2.5 text-gray-700">
                  {sameDay
                    ? formatKoreanDate(req.startDate)
                    : `${formatKoreanDate(req.startDate)} ~ ${formatKoreanDate(req.endDate)}`}
                </td>
                <td className="px-4 py-2.5 text-gray-700">{req.days}일</td>
                <td className="px-4 py-2.5 text-gray-500">
                  {editingReasonId === req.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={draftReason}
                        onChange={(e) => setDraftReason(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveReason(req.id);
                          if (e.key === "Escape") setEditingReasonId(null);
                        }}
                        placeholder="사유 입력"
                        className="w-32 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                      />
                      <button
                        onClick={() => saveReason(req.id)}
                        className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingReasonId(null)}
                        className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  ) : req.reason === "-" ? (
                    <button
                      onClick={() => startEditingReason(req)}
                      className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-600"
                    >
                      사유 입력
                    </button>
                  ) : (
                    <span className="block max-w-[160px] truncate" title={req.reason}>
                      {req.reason}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  <div className="text-xs">
                    <p>{staffById.get(req.handoverStaffId)?.name ?? "-"}</p>
                    <p className="text-gray-400">{req.emergencyContact}</p>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{formatKoreanDate(req.requestedAt)}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[req.status]}`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {req.status === "승인대기" ? (
                      <>
                        <button
                          onClick={() => onDecision(req.id, "승인")}
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => onDecision(req.id, "반려")}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          반려
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {req.decidedBy ? `${req.decidedBy} 처리` : "-"}
                      </span>
                    )}
                    {req.status !== "반려" && (
                      <button
                        onClick={() => handleDeleteClick(req, staff?.name ?? "직원")}
                        title="신청 삭제"
                        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
