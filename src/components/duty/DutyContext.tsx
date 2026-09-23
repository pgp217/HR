"use client";

import { createContext, useContext, useState } from "react";
import { initialDutyPolicy, initialDutyRotation, staffList } from "@/lib/mock-data";
import type { DutyPolicy, DutyRotationEntry } from "@/lib/types";
import { toISODate, today } from "@/lib/date";

const staffById = new Map(staffList.map((s) => [s.id, s]));

export interface AssignResult {
  ok: boolean;
  error?: string;
}

interface DutyContextValue {
  assignments: Record<string, string>;
  policy: DutyPolicy;
  rotation: DutyRotationEntry[];
  assignDuty: (dateISO: string, staffId: string) => AssignResult;
  clearDuty: (dateISO: string) => void;
  autoAssignMonth: (
    year: number,
    month: number,
    opts?: { isOnLeave?: (staffId: string, dateISO: string) => boolean }
  ) => void;
  resetMonth: (year: number, month: number) => void;
  updatePolicy: (patch: Partial<DutyPolicy>) => void;
  updateRotation: (next: DutyRotationEntry[]) => void;
}

const DutyContext = createContext<DutyContextValue | null>(null);

function isPastDeadline(dateISO: string, deadline: string): boolean {
  const todayISO = toISODate(today());
  if (dateISO !== todayISO) return false;
  const [dh, dm] = deadline.split(":").map(Number);
  if (Number.isNaN(dh) || Number.isNaN(dm)) return false;
  const now = new Date();
  const deadlineDate = new Date();
  deadlineDate.setHours(dh, dm, 0, 0);
  return now > deadlineDate;
}

export function DutyProvider({ children }: { children: React.ReactNode }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [policy, setPolicy] = useState<DutyPolicy>(initialDutyPolicy);
  const [rotation, setRotation] = useState<DutyRotationEntry[]>(initialDutyRotation);

  function assignDuty(dateISO: string, staffId: string): AssignResult {
    if (isPastDeadline(dateISO, policy.selectionDeadline)) {
      return {
        ok: false,
        error: `당일 당직 선택은 ${policy.selectionDeadline} 이후 마감되었습니다.`,
      };
    }
    setAssignments((prev) => ({ ...prev, [dateISO]: staffId }));
    return { ok: true };
  }

  function clearDuty(dateISO: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[dateISO];
      return next;
    });
  }

  function autoAssignMonth(
    year: number,
    month: number,
    opts?: { isOnLeave?: (staffId: string, dateISO: string) => boolean }
  ) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const activeRotation = [...rotation].filter((r) => r.active).sort((a, b) => a.order - b.order);
    if (activeRotation.length === 0) return;

    setAssignments((prev) => {
      const next = { ...prev };
      let cursor = 0;

      for (let d = 1; d <= lastDay; d++) {
        const date = new Date(year, month, d);
        const dateISO = toISODate(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (isWeekend && !policy.weekendIncluded) continue;

        let attempts = 0;
        while (attempts < activeRotation.length) {
          const entry = activeRotation[cursor % activeRotation.length];
          cursor++;
          attempts++;

          const excluded =
            entry.excludeStart &&
            entry.excludeEnd &&
            dateISO >= entry.excludeStart &&
            dateISO <= entry.excludeEnd;
          const onLeave = policy.autoExcludeOnLeave && opts?.isOnLeave?.(entry.staffId, dateISO);
          const role = staffById.get(entry.staffId)?.role;
          const roleExcluded =
            (policy.excludeEntryLevel && role === "사원") ||
            (policy.excludeDeptHead && role === "부장");

          if (excluded || onLeave || roleExcluded) continue;

          next[dateISO] = entry.staffId;
          break;
        }
      }
      return next;
    });
  }

  function resetMonth(year: number, month: number) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    setAssignments((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= lastDay; d++) {
        delete next[toISODate(new Date(year, month, d))];
      }
      return next;
    });
  }

  function updatePolicy(patch: Partial<DutyPolicy>) {
    setPolicy((prev) => ({ ...prev, ...patch }));
  }

  function updateRotation(next: DutyRotationEntry[]) {
    setRotation(next);
  }

  const value: DutyContextValue = {
    assignments,
    policy,
    rotation,
    assignDuty,
    clearDuty,
    autoAssignMonth,
    resetMonth,
    updatePolicy,
    updateRotation,
  };

  return <DutyContext.Provider value={value}>{children}</DutyContext.Provider>;
}

export function useDuty() {
  const ctx = useContext(DutyContext);
  if (!ctx) throw new Error("useDuty must be used within a DutyProvider");
  return ctx;
}
