"use client";

import { useState } from "react";
import type { LeaveRequest, LeaveStatus, Staff } from "@/lib/types";
import { formatKoreanDate } from "@/lib/date";

interface Props {
  requests: LeaveRequest[];
  staffById: Map<string, Staff>;
  onDecision: (id: string, status: LeaveStatus) => void;
}

const filters: (LeaveStatus | "전체")[] = ["전체", "승인대기", "승인", "반려"];

const statusStyles: Record<LeaveStatus, string> = {
  승인대기: "bg-amber-50 text-amber-700",
  승인: "bg-green-50 text-green-700",
  반려: "bg-red-50 text-red-700",
};

export default function RequestList({ requests, staffById, onDecision }: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("승인대기");

  const filtered = requests
    .filter((r) => (filter === "전체" ? true : r.status === filter))
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));

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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
            <th className="px-4 py-2 font-medium">직원</th>
            <th className="px-4 py-2 font-medium">종류</th>
            <th className="px-4 py-2 font-medium">기간</th>
            <th className="px-4 py-2 font-medium">일수</th>
            <th className="px-4 py-2 font-medium">사유</th>
            <th className="px-4 py-2 font-medium">신청일</th>
            <th className="px-4 py-2 font-medium">상태</th>
            <th className="px-4 py-2 font-medium">액션</th>
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
          {filtered.map((req) => {
            const staff = staffById.get(req.staffId);
            const sameDay = req.startDate === req.endDate;
            return (
              <tr key={req.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-900">{staff?.name ?? "-"}</td>
                <td className="px-4 py-2.5 text-gray-700">{req.type}</td>
                <td className="px-4 py-2.5 text-gray-700">
                  {sameDay
                    ? formatKoreanDate(req.startDate)
                    : `${formatKoreanDate(req.startDate)} ~ ${formatKoreanDate(req.endDate)}`}
                </td>
                <td className="px-4 py-2.5 text-gray-700">{req.days}일</td>
                <td className="max-w-[160px] truncate px-4 py-2.5 text-gray-500" title={req.reason}>
                  {req.reason}
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
                  {req.status === "승인대기" ? (
                    <div className="flex gap-1">
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
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {req.decidedBy ? `${req.decidedBy} 처리` : "-"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
