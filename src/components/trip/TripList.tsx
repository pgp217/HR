"use client";

import { useState } from "react";
import type { Staff, TripRecord, TripStatus } from "@/lib/types";
import { formatKoreanDate, toISODate, today } from "@/lib/date";

interface Props {
  records: TripRecord[];
  staffById: Map<string, Staff>;
  onDecision: (id: string, status: TripStatus) => void;
  onDelete: (id: string) => void;
}

const filters: (TripStatus | "전체")[] = ["전체", "승인대기", "승인", "반려"];

const statusStyles: Record<TripStatus, string> = {
  승인대기: "bg-amber-50 text-amber-700",
  승인: "bg-green-50 text-green-700",
  반려: "bg-red-50 text-red-700",
};

const todayISO = toISODate(today());

// 오늘로부터 며칠 떨어져 있는지(과거는 음수)를 구한다 — 기본 정렬은 이
// 값의 절댓값이 작은 순, 즉 오늘이 항상 맨 위로 오는 "오늘에 가까운 순".
function dayDistanceFromToday(dateISO: string): number {
  return Math.round((new Date(dateISO).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24));
}

export default function TripList({ records, staffById, onDecision, onDelete }: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("승인대기");

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

  const filtered = records
    .filter((r) => (filter === "전체" ? true : r.status === filter))
    .filter((r) => {
      if (viewMode !== "month") return true;
      const [y, m] = r.startDate.split("-").map(Number);
      return y === navYear && m === navMonth + 1;
    })
    .sort((a, b) => {
      if (viewMode === "month") {
        return a.startDate < b.startDate ? -1 : 1;
      }
      const da = Math.abs(dayDistanceFromToday(a.startDate));
      const db = Math.abs(dayDistanceFromToday(b.startDate));
      if (da !== db) return da - db;
      return a.startDate < b.startDate ? -1 : 1;
    });

  function handleDeleteClick(r: TripRecord, staffName: string) {
    const confirmed = window.confirm(
      `${staffName}님의 ${r.type} 신청(${formatKoreanDate(r.startDate)})을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
    );
    if (confirmed) onDelete(r.id);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">출장·외출 신청 목록</h3>
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
              <th className="px-4 py-2 font-medium">기간/시간</th>
              <th className="px-4 py-2 font-medium">목적지·사유</th>
              <th className="px-4 py-2 font-medium">연락 가능</th>
              <th className="px-4 py-2 font-medium">신청일</th>
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  해당하는 신청 내역이 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const staff = staffById.get(r.staffId);
              const sameDay = r.startDate === r.endDate;
              return (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{staff?.name ?? "-"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        r.type === "출장" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {r.startTime && r.endTime
                      ? `${formatKoreanDate(r.startDate)} ${r.startTime}~${r.endTime}`
                      : sameDay
                        ? formatKoreanDate(r.startDate)
                        : `${formatKoreanDate(r.startDate)} ~ ${formatKoreanDate(r.endDate)}`}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    <span className="block max-w-[220px] truncate" title={r.purpose}>
                      {r.purpose}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.reachable ? (
                      <span className="text-gray-700">연락 가능</span>
                    ) : (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        연락 어려움
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{formatKoreanDate(r.requestedAt)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      {r.status === "승인대기" ? (
                        <>
                          <button
                            onClick={() => onDecision(r.id, "승인")}
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => onDecision(r.id, "반려")}
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            반려
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {r.decidedBy ? `${r.decidedBy} 처리` : "-"}
                        </span>
                      )}
                      {r.status !== "반려" && (
                        <button
                          onClick={() => handleDeleteClick(r, staff?.name ?? "직원")}
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
