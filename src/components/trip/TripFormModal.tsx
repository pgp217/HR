"use client";

import { useState } from "react";
import type { Staff, TripType } from "@/lib/types";
import type { NewTripInput } from "./TripContext";

interface Props {
  staffList: Staff[];
  defaultDate: string;
  onSubmit: (input: NewTripInput) => void;
  onClose: () => void;
}

export default function TripFormModal({ staffList, defaultDate, onSubmit, onClose }: Props) {
  const [staffId, setStaffId] = useState(staffList[0]?.id ?? "");
  const [type, setType] = useState<TripType>("출장");
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [purpose, setPurpose] = useState("");
  const [reachable, setReachable] = useState(true);
  const [error, setError] = useState("");

  const isOuting = type === "외출";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId) {
      setError("직원을 선택해주세요.");
      return;
    }
    if (!isOuting && endDate < startDate) {
      setError("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    if (isOuting && endTime <= startTime) {
      setError("종료 시각은 시작 시각보다 늦어야 합니다.");
      return;
    }
    if (!purpose.trim()) {
      setError("목적지·사유를 입력해주세요.");
      return;
    }

    setError("");
    onSubmit({
      staffId,
      type,
      startDate,
      endDate: isOuting ? startDate : endDate,
      startTime: isOuting ? startTime : undefined,
      endTime: isOuting ? endTime : undefined,
      purpose: purpose.trim(),
      reachable,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">출장·외출 신청 등록</h3>
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
              onChange={(e) => setType(e.target.value as TripType)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="출장">출장</option>
              <option value="외출">외출</option>
            </select>
          </label>

          {isOuting ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">날짜</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-gray-600">시작 시각</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-gray-600">종료 시각</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>
            </>
          ) : (
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
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="text-gray-600">종료일</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">
              목적지·사유 <span className="text-red-500">*</span>
            </span>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              placeholder={isOuting ? "예: 은행 업무" : "예: 대전 협력사 미팅"}
              className="resize-none rounded-md border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reachable}
              onChange={(e) => setReachable(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-gray-600">연락 가능</span>
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
