"use client";

import { useMemo, useState } from "react";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types";
import { staffList, leaveBalances, initialLeaveRequests } from "@/lib/mock-data";
import { daysBetweenInclusive, isWithinRange, toISODate, today } from "@/lib/date";
import SummaryCards from "./SummaryCards";
import BalanceTable from "./BalanceTable";
import RequestList from "./RequestList";
import RequestFormModal from "./RequestFormModal";
import LeaveCalendar from "./LeaveCalendar";

const todayISO = toISODate(today());
const CURRENT_APPROVER = "이서연";

export interface NewRequestInput {
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export default function LeaveManager() {
  const [requests, setRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const staffById = useMemo(() => {
    const map = new Map(staffList.map((s) => [s.id, s]));
    return map;
  }, []);

  const usedDaysByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const staff of staffList) map.set(staff.id, 0);
    for (const req of requests) {
      if (req.status !== "승인") continue;
      map.set(req.staffId, (map.get(req.staffId) ?? 0) + req.days);
    }
    return map;
  }, [requests]);

  const grantedDaysByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of leaveBalances) map.set(b.staffId, b.grantedDays);
    return map;
  }, []);

  const todayOnLeave = useMemo(
    () =>
      requests.filter(
        (r) => r.status === "승인" && isWithinRange(todayISO, r.startDate, r.endDate)
      ),
    [requests]
  );

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "승인대기").length,
    [requests]
  );

  const thisMonthUsedDays = useMemo(() => {
    const now = today();
    const y = now.getFullYear();
    const m = now.getMonth();
    return requests
      .filter((r) => r.status === "승인")
      .reduce((sum, r) => {
        const start = new Date(r.startDate);
        if (start.getFullYear() === y && start.getMonth() === m) {
          return sum + r.days;
        }
        return sum;
      }, 0);
  }, [requests]);

  const totalRemainingDays = useMemo(() => {
    return staffList.reduce((sum, s) => {
      const granted = grantedDaysByStaff.get(s.id) ?? 0;
      const used = usedDaysByStaff.get(s.id) ?? 0;
      return sum + (granted - used);
    }, 0);
  }, [grantedDaysByStaff, usedDaysByStaff]);

  function handleDecision(id: string, status: LeaveStatus) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status, decidedAt: todayISO, decidedBy: CURRENT_APPROVER }
          : r
      )
    );
  }

  function handleCreate(input: NewRequestInput) {
    const days = daysBetweenInclusive(input.startDate, input.endDate);
    const newRequest: LeaveRequest = {
      id: `lr-${Date.now()}`,
      staffId: input.staffId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      days: input.type.startsWith("반차") ? 0.5 : days,
      reason: input.reason || "-",
      status: "승인대기",
      requestedAt: todayISO,
    };
    setRequests((prev) => [newRequest, ...prev]);
    setIsFormOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">휴가·연차 관리</h2>
          <p className="text-sm text-gray-500">직원별 연차 현황과 휴가 신청을 관리합니다.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 휴가 신청 등록
        </button>
      </div>

      <SummaryCards
        todayOnLeaveCount={todayOnLeave.length}
        pendingCount={pendingCount}
        thisMonthUsedDays={thisMonthUsedDays}
        totalRemainingDays={totalRemainingDays}
      />

      <LeaveCalendar
        requests={requests.filter((r) => r.status === "승인")}
        staffById={staffById}
      />

      <BalanceTable
        staffList={staffList}
        grantedDaysByStaff={grantedDaysByStaff}
        usedDaysByStaff={usedDaysByStaff}
        pendingByStaff={requests.filter((r) => r.status === "승인대기")}
      />

      <RequestList requests={requests} staffById={staffById} onDecision={handleDecision} />

      {isFormOpen && (
        <RequestFormModal
          staffList={staffList}
          defaultStart={todayISO}
          defaultEnd={todayISO}
          onSubmit={handleCreate}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
