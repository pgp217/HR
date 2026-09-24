"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { LeaveGrant, LeaveRequest, LeaveStatus, LeaveType, Staff } from "@/lib/types";
import {
  staffList,
  initialLeaveGrants,
  initialLeaveRequests,
  initialLeavePromotionNotices,
  emergencyContacts,
  handoverPartners,
  CURRENT_YEAR,
} from "@/lib/mock-data";
import { daysBetweenInclusive, isWithinRange, toISODate, today } from "@/lib/date";
import { accrualAsOfDateForYear, computeAnnualLeaveDays } from "@/lib/leave-accrual";
import type { LeavePromotionNotice, PromotionBatchNotice, UnderOneYearBatchId } from "@/lib/leave-promotion";

const todayISO = toISODate(today());
const CURRENT_APPROVER = "박기표";

export { CURRENT_YEAR };

export interface NewRequestInput {
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  handoverStaffId: string;
  emergencyContact: string;
}

interface LeaveContextValue {
  requests: LeaveRequest[];
  staffList: Staff[];
  staffById: Map<string, Staff>;
  grants: LeaveGrant[];
  grantedDaysByStaff: Map<string, number>;
  usedDaysByStaff: Map<string, number>;
  remainingDaysByStaff: Map<string, number>;
  promotionNotices: LeavePromotionNotice[];
  todayOnLeaveCount: number;
  pendingCount: number;
  thisMonthUsedDays: number;
  totalRemainingDays: number;
  handleDecision: (id: string, status: LeaveStatus) => void;
  handleCreate: (input: NewRequestInput) => void;
  handleDelete: (id: string) => void;
  handleUpdateReason: (id: string, reason: string) => void;
  updateGrant: (
    staffId: string,
    year: number,
    patch: Partial<Pick<LeaveGrant, "carryover" | "adjustment">>
  ) => void;
  sendFirstNotice: (staffId: string) => void;
  recordEmployeeResponse: (staffId: string, startDate: string, endDate: string) => void;
  sendSecondNotice: (staffId: string, startDate: string, endDate: string) => void;
  sendBatchFirstNotice: (staffId: string, batch: UnderOneYearBatchId) => void;
  recordBatchEmployeeResponse: (
    staffId: string,
    batch: UnderOneYearBatchId,
    startDate: string,
    endDate: string
  ) => void;
  sendBatchSecondNotice: (
    staffId: string,
    batch: UnderOneYearBatchId,
    startDate: string,
    endDate: string
  ) => void;
}

const LeaveContext = createContext<LeaveContextValue | null>(null);

export function LeaveProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [grants, setGrants] = useState<LeaveGrant[]>(initialLeaveGrants);
  const [promotionNotices, setPromotionNotices] = useState<LeavePromotionNotice[]>(
    initialLeavePromotionNotices
  );

  const staffById = useMemo(() => new Map(staffList.map((s) => [s.id, s])), []);

  const grantedDaysByStaff = useMemo(() => {
    const map = new Map<string, number>();
    const asOf = accrualAsOfDateForYear(CURRENT_YEAR, todayISO);
    for (const staff of staffList) {
      const accrued = computeAnnualLeaveDays(staff, CURRENT_YEAR, asOf, staffList.length).days;
      const g = grants.find((gr) => gr.staffId === staff.id && gr.year === CURRENT_YEAR);
      map.set(staff.id, accrued + (g?.carryover ?? 0) + (g?.adjustment ?? 0));
    }
    return map;
  }, [grants]);

  const usedDaysByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const staff of staffList) map.set(staff.id, 0);
    for (const req of requests) {
      if (req.status !== "승인") continue;
      if (Number(req.startDate.slice(0, 4)) !== CURRENT_YEAR) continue;
      map.set(req.staffId, (map.get(req.staffId) ?? 0) + req.days);
    }
    return map;
  }, [requests]);

  const remainingDaysByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const staff of staffList) {
      const granted = grantedDaysByStaff.get(staff.id) ?? 0;
      const used = usedDaysByStaff.get(staff.id) ?? 0;
      map.set(staff.id, granted - used);
    }
    return map;
  }, [grantedDaysByStaff, usedDaysByStaff]);

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
        const [startY, startM] = r.startDate.split("-").map(Number);
        if (startY === y && startM - 1 === m) {
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
      handoverStaffId: input.handoverStaffId,
      emergencyContact: input.emergencyContact,
      status: "승인대기",
      requestedAt: todayISO,
    };
    setRequests((prev) => [newRequest, ...prev]);
  }

  function handleDelete(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  function handleUpdateReason(id: string, reason: string) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, reason } : r)));
  }

  function updateGrant(
    staffId: string,
    year: number,
    patch: Partial<Pick<LeaveGrant, "carryover" | "adjustment">>
  ) {
    setGrants((prev) => {
      const idx = prev.findIndex((g) => g.staffId === staffId && g.year === year);
      if (idx === -1) {
        return [...prev, { staffId, year, carryover: 0, adjustment: 0, ...patch }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function updatePromotionNotice(staffId: string, patch: Partial<LeavePromotionNotice>) {
    setPromotionNotices((prev) => {
      const idx = prev.findIndex((n) => n.staffId === staffId && n.year === CURRENT_YEAR);
      if (idx === -1) {
        return [...prev, { staffId, year: CURRENT_YEAR, ...patch }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function sendFirstNotice(staffId: string) {
    const remaining = remainingDaysByStaff.get(staffId) ?? 0;
    updatePromotionNotice(staffId, { firstNoticeAt: todayISO, firstNoticeDays: remaining });
  }

  function createLinkedLeaveRequest(staffId: string, startDate: string, endDate: string, reason: string): string {
    const id = `promo-${staffId}-${CURRENT_YEAR}-${Date.now()}`;
    const newRequest: LeaveRequest = {
      id,
      staffId,
      type: "연차",
      startDate,
      endDate,
      days: daysBetweenInclusive(startDate, endDate),
      reason,
      handoverStaffId: handoverPartners[staffId] ?? "",
      emergencyContact: emergencyContacts[staffId] ?? "",
      status: "승인",
      requestedAt: todayISO,
      decidedAt: todayISO,
      decidedBy: CURRENT_APPROVER,
    };
    setRequests((prev) => [newRequest, ...prev]);
    return id;
  }

  function recordEmployeeResponse(staffId: string, startDate: string, endDate: string) {
    const leaveRequestId = createLinkedLeaveRequest(
      staffId,
      startDate,
      endDate,
      "연차 사용 촉진 (근로자 지정)"
    );
    updatePromotionNotice(staffId, {
      employeeSpecifiedAt: todayISO,
      employeeSpecifiedStart: startDate,
      employeeSpecifiedEnd: endDate,
      employeeLeaveRequestId: leaveRequestId,
    });
  }

  function sendSecondNotice(staffId: string, startDate: string, endDate: string) {
    const leaveRequestId = createLinkedLeaveRequest(
      staffId,
      startDate,
      endDate,
      "연차 사용 촉진 (2차 통보 - 사용자 지정)"
    );
    updatePromotionNotice(staffId, {
      secondNoticeAt: todayISO,
      secondNoticeStart: startDate,
      secondNoticeEnd: endDate,
      secondNoticeLeaveRequestId: leaveRequestId,
    });
  }

  function updatePromotionBatchNotice(
    staffId: string,
    batch: UnderOneYearBatchId,
    patch: Partial<PromotionBatchNotice>
  ) {
    const key = batch === "A" ? "underOneYearBatchA" : "underOneYearBatchB";
    setPromotionNotices((prev) => {
      const idx = prev.findIndex((n) => n.staffId === staffId && n.year === CURRENT_YEAR);
      if (idx === -1) {
        return [...prev, { staffId, year: CURRENT_YEAR, [key]: patch }];
      }
      const next = [...prev];
      const existingBatch = next[idx][key] ?? {};
      next[idx] = { ...next[idx], [key]: { ...existingBatch, ...patch } };
      return next;
    });
  }

  function sendBatchFirstNotice(staffId: string, batch: UnderOneYearBatchId) {
    updatePromotionBatchNotice(staffId, batch, { firstNoticeAt: todayISO });
  }

  function recordBatchEmployeeResponse(
    staffId: string,
    batch: UnderOneYearBatchId,
    startDate: string,
    endDate: string
  ) {
    const leaveRequestId = createLinkedLeaveRequest(
      staffId,
      startDate,
      endDate,
      `연차 사용 촉진 (1년 미만 ${batch}묶음 - 근로자 지정)`
    );
    updatePromotionBatchNotice(staffId, batch, {
      employeeSpecifiedAt: todayISO,
      employeeSpecifiedStart: startDate,
      employeeSpecifiedEnd: endDate,
      leaveRequestId,
    });
  }

  function sendBatchSecondNotice(
    staffId: string,
    batch: UnderOneYearBatchId,
    startDate: string,
    endDate: string
  ) {
    const leaveRequestId = createLinkedLeaveRequest(
      staffId,
      startDate,
      endDate,
      `연차 사용 촉진 (1년 미만 ${batch}묶음 - 2차 통보)`
    );
    updatePromotionBatchNotice(staffId, batch, {
      secondNoticeAt: todayISO,
      secondNoticeStart: startDate,
      secondNoticeEnd: endDate,
      secondLeaveRequestId: leaveRequestId,
    });
  }

  const value: LeaveContextValue = {
    requests,
    staffList,
    staffById,
    grants,
    grantedDaysByStaff,
    usedDaysByStaff,
    remainingDaysByStaff,
    promotionNotices,
    todayOnLeaveCount,
    pendingCount,
    thisMonthUsedDays,
    totalRemainingDays,
    handleDecision,
    handleCreate,
    handleDelete,
    handleUpdateReason,
    updateGrant,
    sendFirstNotice,
    recordEmployeeResponse,
    sendSecondNotice,
    sendBatchFirstNotice,
    recordBatchEmployeeResponse,
    sendBatchSecondNotice,
  };

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used within a LeaveProvider");
  return ctx;
}
