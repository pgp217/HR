"use client";

import { createContext, useContext, useState } from "react";
import { staffList } from "@/lib/mock-data";
import { toISODate } from "@/lib/date";

interface DutyContextValue {
  assignments: Record<string, string>;
  assignDuty: (dateISO: string, staffId: string) => void;
  clearDuty: (dateISO: string) => void;
  autoAssignMonth: (year: number, month: number) => void;
  resetMonth: (year: number, month: number) => void;
}

const DutyContext = createContext<DutyContextValue | null>(null);

export function DutyProvider({ children }: { children: React.ReactNode }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  function assignDuty(dateISO: string, staffId: string) {
    setAssignments((prev) => ({ ...prev, [dateISO]: staffId }));
  }

  function clearDuty(dateISO: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[dateISO];
      return next;
    });
  }

  function autoAssignMonth(year: number, month: number) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    setAssignments((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= lastDay; d++) {
        const dateISO = toISODate(new Date(year, month, d));
        next[dateISO] = staffList[(d - 1) % staffList.length].id;
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

  const value: DutyContextValue = {
    assignments,
    assignDuty,
    clearDuty,
    autoAssignMonth,
    resetMonth,
  };

  return <DutyContext.Provider value={value}>{children}</DutyContext.Provider>;
}

export function useDuty() {
  const ctx = useContext(DutyContext);
  if (!ctx) throw new Error("useDuty must be used within a DutyProvider");
  return ctx;
}
