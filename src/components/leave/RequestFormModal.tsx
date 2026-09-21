"use client";

import { useState } from "react";
import type { LeaveType, Staff } from "@/lib/types";
import type { NewRequestInput } from "./LeaveManager";

interface Props {
  staffList: Staff[];
  defaultStart: string;
  defaultEnd: string;
  onSubmit: (input: NewRequestInput) => void;
  onClose: () => void;
}

const leaveTypes: LeaveType[] = ["연차", "반차(오전)", "반차(오후)", "경조사", "병가"];

export default function RequestFormModal({
  staffList,
  defaultStart,
  defaultEnd,
  onSubmit,
  onClose,
}: Props) {
  const [staffId, setStaffId] = useState(staffList[0]?.id ?? "");
  const [type, setType] = useState<LeaveType>("연차");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const isHalfDay = type.startsWith("반차");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId) {
      setError("직원을 선택해주세요.");
      return;
    }
    if (endDate < startDate) {
      setError("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    onSubmit({ staffId, type, startDate, endDate: isHalfDay ? startDate : endDate, reason });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">휴가 신청 등록</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">직원</span>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">종류</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              {leaveTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-gray-600">시작일</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            {!isHalfDay && (
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="text-gray-600">종료일</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
            )}
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">사유</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="사유를 입력하세요"
              className="resize-none rounded-md border border-gray-300 px-3 py-2"
            />
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              신청 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
