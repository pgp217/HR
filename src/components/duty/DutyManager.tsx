"use client";

import { useMemo, useState } from "react";
import { staffList } from "@/lib/mock-data";
import { formatKoreanDate, getMonthMatrix, isWithinRange, toISODate, today } from "@/lib/date";
import { useDuty } from "./DutyContext";
import { useLeave } from "@/components/leave/LeaveContext";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const todayISO = toISODate(today());

export default function DutyManager() {
  const now = today();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [pendingStaffId, setPendingStaffId] = useState("");
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const { assignments, assignDuty, clearDuty, autoAssignMonth, resetMonth } = useDuty();
  const { requests } = useLeave();

  const staffById = useMemo(() => new Map(staffList.map((s) => [s.id, s])), []);

  function isOnLeave(staffId: string, dateISO: string) {
    return requests.some(
      (r) => r.staffId === staffId && r.status === "승인" && isWithinRange(dateISO, r.startDate, r.endDate)
    );
  }
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

  function handleDropOnDate(dateISO: string, e: React.DragEvent) {
    e.preventDefault();
    const staffId = e.dataTransfer.getData("text/plain");
    if (staffId) {
      const result = assignDuty(dateISO, staffId);
      if (!result.ok && result.error) alert(result.error);
    }
    setDragOverDate(null);
  }

  function handleDropOnQueue(e: React.DragEvent) {
    e.preventDefault();
    const fromDate = e.dataTransfer.getData("application/x-from-date");
    if (fromDate) clearDuty(fromDate);
  }

  function handleAutoAssign() {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const hasExisting = Object.keys(assignments).some((dateISO) => dateISO.startsWith(monthPrefix));
    if (hasExisting) {
      const confirmed = window.confirm(
        `${year}년 ${month + 1}월에 이미 배정된 당직이 있습니다. 자동 배정을 실행하면 기존 배정이 덮어써집니다. 계속할까요?`
      );
      if (!confirmed) return;
    }
    autoAssignMonth(year, month, { isOnLeave });
  }

  function handleResetMonth() {
    const confirmed = window.confirm(
      `${year}년 ${month + 1}월 당직 일정을 모두 초기화할까요? 이 작업은 되돌릴 수 없습니다.`
    );
    if (confirmed) resetMonth(year, month);
  }

  function handleAssignSelected() {
    if (!pendingStaffId) return;
    const result = assignDuty(selectedDate, pendingStaffId);
    if (!result.ok && result.error) {
      alert(result.error);
      return;
    }
    setPendingStaffId("");
  }

  const selectedStaffId = assignments[selectedDate];
  const selectedStaff = selectedStaffId ? staffById.get(selectedStaffId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">당직 일정</h2>
        <p className="text-sm text-gray-500">
          직원을 달력에 배정해 하루 단위 당직 담당자를 관리합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_280px]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">직원 대기열</h3>
          <p className="mt-1 text-xs text-gray-400">
            이름을 달력 날짜로 끌어다 놓으면 당직 추가, 달력의 이름을 이 영역으로 끌면 해제.
          </p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnQueue}
            className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-dashed border-gray-200 p-2"
          >
            {staffList.map((s) => (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", s.id);
                }}
                className="cursor-grab select-none rounded-md bg-amber-50 px-2 py-1.5 text-center text-xs font-medium text-amber-800 active:cursor-grabbing"
              >
                {s.name}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
            <div className="flex gap-2">
              <button
                onClick={handleAutoAssign}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                월 자동 배정
              </button>
              <button
                onClick={handleResetMonth}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                이번 달 당직 리셋
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
              const isToday = dateISO === todayISO;
              const isSelected = dateISO === selectedDate;
              const dayNum = Number(dateISO.slice(-2));
              const assignedStaffId = assignments[dateISO];
              const assignedStaff = assignedStaffId ? staffById.get(assignedStaffId) : undefined;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(dateISO)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDate(dateISO);
                  }}
                  onDragLeave={() => setDragOverDate((d) => (d === dateISO ? null : d))}
                  onDrop={(e) => handleDropOnDate(dateISO, e)}
                  className={`min-h-[76px] cursor-pointer bg-white p-1 ${
                    isSelected ? "ring-2 ring-inset ring-blue-500" : ""
                  } ${dragOverDate === dateISO ? "bg-blue-50" : ""}`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      isToday ? "bg-blue-600 font-semibold text-white" : "text-gray-500"
                    }`}
                  >
                    {dayNum}
                  </span>
                  <div className="mt-1">
                    {assignedStaff ? (
                      <span
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", assignedStaff.id);
                          e.dataTransfer.setData("application/x-from-date", dateISO);
                        }}
                        className="inline-block cursor-grab truncate rounded bg-amber-50 px-1 py-0.5 text-[10px] text-amber-800"
                      >
                        {assignedStaff.name}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {formatKoreanDate(selectedDate)}
            </span>
            {selectedDate === todayISO && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                오늘
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500">현재 당직자</p>
          <p className="mt-1 text-sm">
            {selectedStaff ? (
              <span className="font-medium text-gray-900">{selectedStaff.name}</span>
            ) : (
              <span className="text-gray-400">지정된 당직자가 없습니다.</span>
            )}
          </p>

          <div className="mt-4">
            <p className="mb-1 text-xs text-gray-500">담당자 변경 / 지정</p>
            <select
              value={pendingStaffId}
              onChange={(e) => setPendingStaffId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">직원 선택...</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssignSelected}
              disabled={!pendingStaffId}
              className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              담당자 지정
            </button>
            {selectedStaff && (
              <button
                onClick={() => clearDuty(selectedDate)}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                당직 해제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
