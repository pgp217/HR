"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLeave } from "@/components/leave/LeaveContext";
import { useDuty } from "@/components/duty/DutyContext";
import { useTrip } from "@/components/trip/TripContext";
import { formatKoreanDate, isWithinRange, toISODate, today } from "@/lib/date";
import { checkStaffingOnDate } from "@/lib/leave-conflict";
import { formatLeaveTypeLabel, HALF_DAY_TIME_RANGES, isNowWithin } from "@/lib/leave-display";

export default function TodayPage() {
  const todayISO = toISODate(today());
  const { requests, staffList, pendingCount } = useLeave();
  const { assignments } = useDuty();
  const { records: tripRecords } = useTrip();

  const onLeaveToday = requests.filter(
    (r) => r.status === "승인" && isWithinRange(todayISO, r.startDate, r.endDate)
  );
  const onLeaveStaffIds = new Set(onLeaveToday.map((r) => r.staffId));
  const dutyStaffId = assignments[todayISO];
  const staffingConflict = checkStaffingOnDate(todayISO, requests, staffList);

  const todayTrips = tripRecords.filter(
    (r) => r.status === "승인" && isWithinRange(todayISO, r.startDate, r.endDate)
  );
  const tripByStaffId = new Map(todayTrips.map((r) => [r.staffId, r]));

  // "현재 인원": 오늘 일정이 아니라 지금 이 순간 자리에 있는지를 본다.
  // 반차/외출은 지정된 시간대에만 부재로 치고, 종일 휴가·출장은 하루
  // 내내 부재로 친다. 현재 시각을 쓰므로 서버 렌더링 시점과 브라우저
  // 시점이 어긋나 하이드레이션 불일치가 나지 않도록 마운트 이후에만
  // 계산한다.
  const [currentPresentCount, setCurrentPresentCount] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const nowHHmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const leaveToday = requests.filter(
      (r) => r.status === "승인" && isWithinRange(todayISO, r.startDate, r.endDate)
    );
    const tripToday = new Map(
      tripRecords
        .filter((r) => r.status === "승인" && isWithinRange(todayISO, r.startDate, r.endDate))
        .map((r) => [r.staffId, r])
    );

    const currentlyAbsentIds = new Set<string>();
    for (const staff of staffList) {
      const leaveReq = leaveToday.find((r) => r.staffId === staff.id);
      if (leaveReq) {
        const halfRange = HALF_DAY_TIME_RANGES[leaveReq.type];
        if (halfRange ? isNowWithin(nowHHmm, halfRange.start, halfRange.end) : true) {
          currentlyAbsentIds.add(staff.id);
        }
      }
      const trip = tripToday.get(staff.id);
      if (trip) {
        const stillAway =
          trip.type === "출장" ||
          (trip.startTime && trip.endTime && isNowWithin(nowHHmm, trip.startTime, trip.endTime));
        if (stillAway) currentlyAbsentIds.add(staff.id);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPresentCount(staffList.length - currentlyAbsentIds.size);
  }, [staffList, requests, tripRecords, todayISO]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{formatKoreanDate(todayISO)} 오늘 현황</h2>
          <p className="text-sm text-gray-500">직원별 오늘 근무 · 휴가 현황을 확인합니다.</p>
        </div>
      </div>

      {staffingConflict.hasConflict && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">⚠ 오늘 최소 근무 인원 기준 위반</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-sm text-red-600">
            {staffingConflict.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">🟢 현재 인원</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {currentPresentCount === null ? "-" : `${currentPresentCount}명`}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">전체 인원</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{staffList.length}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">오늘 휴가</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{onLeaveToday.length}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">오늘 출장·외출</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{todayTrips.length}건</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">정상 근무</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {staffList.length - onLeaveToday.length}명
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">휴가 승인 대기</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}건</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">직원별 오늘 운영 상태</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs whitespace-nowrap text-gray-500">
              <th className="px-4 py-2 font-medium">직원</th>
              <th className="px-4 py-2 font-medium">역할</th>
              <th className="px-4 py-2 font-medium">근무</th>
              <th className="px-4 py-2 font-medium">당직</th>
              <th className="px-4 py-2 font-medium">출장·외출</th>
              <th className="px-4 py-2 font-medium">휴가</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => {
              const onLeave = onLeaveStaffIds.has(staff.id);
              const leaveReq = onLeaveToday.find((r) => r.staffId === staff.id);
              const onDuty = staff.id === dutyStaffId;
              return (
                <tr key={staff.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{staff.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{staff.role}</td>
                  <td className="px-4 py-2.5">
                    {onLeave ? (
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {leaveReq && formatLeaveTypeLabel(leaveReq.type)}
                      </span>
                    ) : (
                      <span className="text-gray-700">정상근무</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {onDuty ? (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        당직
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {tripByStaffId.has(staff.id) ? (
                      <span
                        title={tripByStaffId.get(staff.id)?.purpose}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          tripByStaffId.get(staff.id)?.type === "출장"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {tripByStaffId.get(staff.id)?.type}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{onLeave ? "휴가" : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        당직 배정은{" "}
        <Link href="/operations/staff-schedule/duty" className="text-blue-600 underline">
          당직 일정
        </Link>
        , 휴가 승인은{" "}
        <Link href="/operations/staff-schedule/leave" className="text-blue-600 underline">
          휴가·연차 관리
        </Link>
        , 출장·외출 등록은{" "}
        <Link href="/operations/staff-schedule/trip" className="text-blue-600 underline">
          출장·외출 관리
        </Link>
        에서 확인해주세요.
      </p>
    </div>
  );
}
