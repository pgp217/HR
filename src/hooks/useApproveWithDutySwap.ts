"use client";

import { useLeave } from "@/components/leave/LeaveContext";
import { useDuty } from "@/components/duty/DutyContext";
import { formatKoreanDate, isWithinRange } from "@/lib/date";
import type { LeaveStatus } from "@/lib/types";

/**
 * Wraps leave-request approval so that approving a leave whose staff member
 * is already duty-assigned on an overlapping date offers to swap that duty
 * to the request's designated handover person.
 */
export function useApproveWithDutySwap() {
  const { requests, staffById, handleDecision } = useLeave();
  const { assignments, assignDuty } = useDuty();

  function decide(id: string, status: LeaveStatus) {
    const req = requests.find((r) => r.id === id);
    handleDecision(id, status);

    if (status !== "승인" || !req) return;

    const affectedDates = Object.keys(assignments).filter(
      (dateISO) =>
        assignments[dateISO] === req.staffId && isWithinRange(dateISO, req.startDate, req.endDate)
    );

    if (affectedDates.length === 0) return;

    const staffName = staffById.get(req.staffId)?.name ?? "직원";
    const handoverName = staffById.get(req.handoverStaffId)?.name ?? "인수인계자";
    const dateList = affectedDates
      .sort()
      .map((d) => formatKoreanDate(d))
      .join(", ");

    const confirmed = window.confirm(
      `${staffName}님이 당직으로 지정된 날짜(${dateList})에 휴가가 승인되었습니다.\n` +
        `인수인계자 ${handoverName}님으로 당직을 교체할까요?`
    );
    if (confirmed) {
      const failures: string[] = [];
      for (const dateISO of affectedDates) {
        const result = assignDuty(dateISO, req.handoverStaffId);
        if (!result.ok && result.error) failures.push(`${formatKoreanDate(dateISO)}: ${result.error}`);
      }
      if (failures.length > 0) {
        alert(`일부 날짜는 당직 교체에 실패했습니다.\n${failures.join("\n")}`);
      }
    }
  }

  return decide;
}
