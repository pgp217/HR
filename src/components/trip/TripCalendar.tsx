"use client";

import { useState } from "react";
import type { Staff, TripRecord } from "@/lib/types";
import { getMonthMatrix, isWithinRange, toISODate, today } from "@/lib/date";

interface Props {
  records: TripRecord[];
  staffById: Map<string, Staff>;
}

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const todayISO = toISODate(today());

const typeStyles = {
  출장: "bg-blue-50 text-blue-700",
  외출: "bg-amber-50 text-amber-700",
};

export default function TripCalendar({ records, staffById }: Props) {
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
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">근태 캘린더</h3>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> 출장
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> 외출
          </span>
        </div>
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
          const onThatDay = records.filter((r) => isWithinRange(dateISO, r.startDate, r.endDate));
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
                {onThatDay.slice(0, 3).map((r) => (
                  <span
                    key={r.id}
                    title={`${staffById.get(r.staffId)?.name} · ${r.type} · ${r.purpose}`}
                    className={`truncate rounded px-1 py-0.5 text-[10px] ${typeStyles[r.type]}`}
                  >
                    {staffById.get(r.staffId)?.name}
                  </span>
                ))}
                {onThatDay.length > 3 && (
                  <span className="text-[10px] text-gray-400">+{onThatDay.length - 3}명</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
