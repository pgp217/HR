"use client";

import Link from "next/link";
import { useLeave } from "@/components/leave/LeaveContext";
import { useDuty } from "@/components/duty/DutyContext";
import { useTrip } from "@/components/trip/TripContext";
import { formatKoreanDate, isWithinRange, toISODate, today } from "@/lib/date";
import { checkStaffingOnDate } from "@/lib/leave-conflict";

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

  const todayTrips = tripRecords.filter((r) => isWithinRange(todayISO, r.startDate, r.endDate));
  const tripByStaffId = new Map(todayTrips.map((r) => [r.staffId, r]));

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">휴가 승인 대기</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}건</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">정상 근무</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {staffList.length - onLeaveToday.length}명
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">직원별 오늘 운영 상태</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
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
                        {leaveReq?.type}
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
