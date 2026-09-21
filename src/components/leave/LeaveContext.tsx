"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { LeaveRequest, LeaveStatus, LeaveType, Staff } from "@/lib/types";
import { staffList, leaveBalances, initialLeaveRequests } from "@/lib/mock-data";
import { daysBetweenInclusive, isWithinRange, toISODate, today } from "@/lib/date";

const todayISO = toISODate(today());
const CURRENT_APPROVER = "이서연";

export interface NewRequestInput {
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

interface LeaveContextValue {
  requests: LeaveRequest[];
  staffList: Staff[];
  staffById: Map<string, Staff>;
  grantedDaysByStaff: Map<string, number>;
  usedDaysByStaff: Map<string, number>;
  todayOnLeaveCount: number;
  pendingCount: number;
  thisMonthUsedDays: number;
  totalRemainingDays: number;
  handleDecision: (id: string, status: LeaveStatus) => void;
  handleCreate: (input: NewRequestInput) => void;
}

const LeaveContext = createContext<LeaveContextValue | null>(null);

export function LeaveProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<LeaveRequest[]>(initialLeaveRequests);

  const staffById = useMemo(() => new Map(staffList.map((s) => [s.id, s])), []);

  const grantedDaysByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of leaveBalances) map.set(b.staffId, b.grantedDays);
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

  const todayOnLeaveCount = useMemo(
    () =>
      requests.filter(
        (r) => r.status === "승인" && isWithinRange(todayISO, r.startDate, r.endDate)
      ).length,
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
        r.id === id ? { ...r, status, decidedAt: todayISO, decidedBy: CURRENT_APPROVER } : r
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
  }

  const value: LeaveContextValue = {
    requests,
    staffList,
    staffById,
    grantedDaysByStaff,
    usedDaysByStaff,
    todayOnLeaveCount,
    pendingCount,
    thisMonthUsedDays,
    totalRemainingDays,
    handleDecision,
    handleCreate,
  };

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used within a LeaveProvider");
  return ctx;
}
