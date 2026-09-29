"use client";

import { useState } from "react";
import type { LeaveRequest, Staff } from "@/lib/types";
import { getMonthMatrix, isWithinRange, toISODate, today } from "@/lib/date";
import { formatLeaveTypeLabel } from "@/lib/leave-display";

interface Props {
  requests: LeaveRequest[];
  staffById: Map<string, Staff>;
}

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const todayISO = toISODate(today());

export default function LeaveCalendar({ requests, staffById }: Props) {
  const now = today();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const weeks = getMonthMatrix(year, month);

  function goToPrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">휴가 캘린더</h3>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={goToPrevMonth} className="rounded px-2 py-1 hover:bg-gray-100">
            ‹
          </button>
          <span className="w-24 text-center font-medium text-gray-700">
            {year}년 {month + 1}월
          </span>
          <button onClick={goToNextMonth} className="rounded px-2 py-1 hover:bg-gray-100">
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-gray-100 bg-gray-100 text-xs">
        {weekdays.map((w) => (
          <div key={w} className="bg-gray-50 py-1.5 text-center font-medium text-gray-500">
            {w}
          </div>
        ))}
        {weeks.flat().map((dateISO, idx) => {
          if (!dateISO) {
            return <div key={idx} className="min-h-[76px] bg-white" />;
          }
          const onLeave = requests.filter((r) => isWithinRange(dateISO, r.startDate, r.endDate));
          const isToday = dateISO === todayISO;
          const dayNum = Number(dateISO.slice(-2));

          return (
            <div key={idx} className="min-h-[76px] bg-white p-1">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  isToday ? "bg-blue-600 font-semibold text-white" : "text-gray-500"
                }`}
              >
                {dayNum}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                {onLeave.slice(0, 3).map((r) => (
                  <span
                    key={r.id}
                    title={`${staffById.get(r.staffId)?.name} · ${formatLeaveTypeLabel(r.type)}`}
                    className="w-fit max-w-full self-start truncate rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-700"
                  >
                    {staffById.get(r.staffId)?.name}
                  </span>
                ))}
                {onLeave.length > 3 && (
                  <span className="text-[10px] text-gray-400">+{onLeave.length - 3}명</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
