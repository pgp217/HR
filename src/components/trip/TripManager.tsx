"use client";

import { useState } from "react";
import { useTrip } from "./TripContext";
import TripCalendar from "./TripCalendar";
import TripList from "./TripList";
import TripFormModal from "./TripFormModal";
import { toISODate, today } from "@/lib/date";

export default function TripManager() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const {
    records,
    staffList,
    staffById,
    todayTripCount,
    todayOutingCount,
    thisWeekCount,
    unreachableCount,
    pendingCount,
    handleCreate,
    handleDecision,
    handleDelete,
  } = useTrip();

  const todayISO = toISODate(today());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">출장·외출 관리</h2>
          <p className="text-sm text-gray-500">직원별 출장·외출 현황을 등록하고 확인합니다.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 출장·외출 신청 등록
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">🧳 오늘 출장</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{todayTripCount}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">🚶 오늘 외출</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{todayOutingCount}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">📅 이번주 신청 건수</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{thisWeekCount}건</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">승인 대기</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}건</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">⚠️ 연락 어려움</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{unreachableCount}건</p>
        </div>
      </div>

      <TripCalendar records={records.filter((r) => r.status === "승인")} staffById={staffById} />

      <TripList records={records} staffById={staffById} onDecision={handleDecision} onDelete={handleDelete} />

      {isFormOpen && (
        <TripFormModal
          staffList={staffList}
          defaultDate={todayISO}
          onSubmit={(input) => {
            handleCreate(input);
            setIsFormOpen(false);
          }}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
