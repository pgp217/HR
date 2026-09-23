"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Staff, TripRecord, TripStatus, TripType } from "@/lib/types";
import { staffList, initialTripRecords } from "@/lib/mock-data";
import { isWithinRange, toISODate, today } from "@/lib/date";

const todayISO = toISODate(today());
const CURRENT_APPROVER = "박기표";

export interface NewTripInput {
  staffId: string;
  type: TripType;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  purpose: string;
  reachable: boolean;
}

interface TripContextValue {
  records: TripRecord[];
  staffList: Staff[];
  staffById: Map<string, Staff>;
  todayTripCount: number;
  todayOutingCount: number;
  thisWeekCount: number;
  unreachableCount: number;
  pendingCount: number;
  handleCreate: (input: NewTripInput) => void;
  handleDecision: (id: string, status: TripStatus) => void;
  handleDelete: (id: string) => void;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<TripRecord[]>(initialTripRecords);

  const staffById = useMemo(() => new Map(staffList.map((s) => [s.id, s])), []);

  const todayTripCount = useMemo(
    () =>
      records.filter(
        (r) => r.type === "출장" && r.status === "승인" && isWithinRange(todayISO, r.startDate, r.endDate)
      ).length,
    [records]
  );

  const todayOutingCount = useMemo(
    () =>
      records.filter(
        (r) => r.type === "외출" && r.status === "승인" && isWithinRange(todayISO, r.startDate, r.endDate)
      ).length,
    [records]
  );

  const thisWeekCount = useMemo(() => {
    const weekAgo = toISODate(new Date(today().getTime() - 6 * 24 * 60 * 60 * 1000));
    return records.filter((r) => r.startDate >= weekAgo && r.startDate <= todayISO).length;
  }, [records]);

  const unreachableCount = useMemo(() => records.filter((r) => !r.reachable).length, [records]);

  const pendingCount = useMemo(
    () => records.filter((r) => r.status === "승인대기").length,
    [records]
  );

  function handleCreate(input: NewTripInput) {
    const record: TripRecord = {
      ...input,
      id: `trip-${Date.now()}`,
      status: "승인대기",
      requestedAt: todayISO,
    };
    setRecords((prev) => [record, ...prev]);
  }

  function handleDecision(id: string, status: TripStatus) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status, decidedAt: todayISO, decidedBy: CURRENT_APPROVER } : r
      )
    );
  }

  function handleDelete(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  const value: TripContextValue = {
    records,
    staffList,
    staffById,
    todayTripCount,
    todayOutingCount,
    thisWeekCount,
    unreachableCount,
    pendingCount,
    handleCreate,
    handleDecision,
    handleDelete,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within a TripProvider");
  return ctx;
}
