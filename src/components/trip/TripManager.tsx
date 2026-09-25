"use client";

import { useEffect, useState } from "react";
import { useTrip } from "./TripContext";
import TripCalendar from "./TripCalendar";
import TripList from "./TripList";
import TripFormModal from "./TripFormModal";
import { isWithinRange, toISODate, today } from "@/lib/date";
import { isNowWithin } from "@/lib/leave-display";

export default function TripManager() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const {
    records,
    staffList,
    staffById,
    todayTripCount,
    todayOutingCount,
    pendingCount,
    handleCreate,
    handleDecision,
    handleDelete,
  } = useTrip();

  const todayISO = toISODate(today());

  // 지금 이 순간 연락이 어려운 인원만 센다 — 승인된 출장·외출 중 오늘
  // 진행 중이면서(외출은 지정 시간대 내에 있을 때만) 연락 불가로 표시된
  // 건. 현재 시각을 쓰므로 마운트 이후에만 계산해 하이드레이션 불일치를
  // 피한다.
  const [unreachableNowCount, setUnreachableNowCount] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const nowHHmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const count = records.filter((r) => {
      if (r.status !== "승인" || r.reachable) return false;
      if (!isWithinRange(todayISO, r.startDate, r.endDate)) return false;
      if (r.startTime && r.endTime) return isNowWithin(nowHHmm, r.startTime, r.endTime);
      return true;
    }).length;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnreachableNowCount(count);
  }, [records, todayISO]);

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">🧳 오늘 출장</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{todayTripCount}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">🚶 오늘 외출</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{todayOutingCount}명</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">승인 대기</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}건</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">⚠️ 지금 연락 어려움</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {unreachableNowCount === null ? "-" : `${unreachableNowCount}명`}
          </p>
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
