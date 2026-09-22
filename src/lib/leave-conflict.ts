import type { LeaveRequest, Staff, StaffRole } from "./types";
import { isWithinRange, toISODate, formatKoreanDate } from "./date";

// 같은 날 여러 명이 휴가를 신청해 인원이 몰릴 때를 대비한 정책. 두 기준을
// 함께 적용하고, 하나라도 걸리면 승인 전에 경고만 한다 — 강제로 승인을
// 막지는 않고, 최종 판단은 승인권자가 직접 하도록 남겨둔다.
//   1) 역할별 최소 근무 인원: 같은 역할 그룹에서 남는 인원이 기준 밑으로
//      내려가면 경고 (담당자 5명 중 최소 3명, 서무 2명 중 최소 1명 유지)
//   2) 전체 인원 대비 동시 휴가 비율: 역할 구분 없이 전체 직원 중 동시
//      휴가자가 기준 비율을 넘으면 경고 (30%)

export const MIN_STAFF_PER_ROLE: Record<StaffRole, number> = {
  담당자: 3,
  서무: 1,
};

export const MAX_CONCURRENT_LEAVE_RATIO = 0.3;

function datesInRange(startISO: string, endISO: string): string[] {
  const [y, m, d] = startISO.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
  const dates: string[] = [];
  while (toISODate(cursor) <= endISO) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export interface LeaveConflictResult {
  hasConflict: boolean;
  messages: string[];
}

/**
 * candidateRequest가 "승인" 상태가 됐다고 가정했을 때, 이미 승인된 다른
 * 휴가 신청과 겹쳐서 최소 근무 인원 기준을 위반하는 날짜가 있는지 검사한다.
 */
export function checkLeaveConflict(
  candidateRequest: LeaveRequest,
  allRequests: LeaveRequest[],
  staffList: Staff[]
): LeaveConflictResult {
  const staffById = new Map(staffList.map((s) => [s.id, s]));
  const roleTotals = new Map<StaffRole, number>();
  for (const s of staffList) roleTotals.set(s.role, (roleTotals.get(s.role) ?? 0) + 1);

  const approvedOthers = allRequests.filter(
    (r) => r.status === "승인" && r.id !== candidateRequest.id
  );

  const messages: string[] = [];

  for (const dateISO of datesInRange(candidateRequest.startDate, candidateRequest.endDate)) {
    const onLeaveIds = new Set<string>([candidateRequest.staffId]);
    for (const r of approvedOthers) {
      if (isWithinRange(dateISO, r.startDate, r.endDate)) onLeaveIds.add(r.staffId);
    }

    const roleOnLeave = new Map<StaffRole, number>();
    for (const id of onLeaveIds) {
      const staff = staffById.get(id);
      if (!staff) continue;
      roleOnLeave.set(staff.role, (roleOnLeave.get(staff.role) ?? 0) + 1);
    }

    for (const [role, total] of roleTotals) {
      const onLeave = roleOnLeave.get(role) ?? 0;
      const remaining = total - onLeave;
      const min = MIN_STAFF_PER_ROLE[role] ?? 0;
      if (remaining < min) {
        messages.push(
          `${formatKoreanDate(dateISO)}: ${role} 근무 인원 ${remaining}명 (최소 ${min}명 필요)`
        );
      }
    }

    const totalStaff = staffList.length;
    const ratio = onLeaveIds.size / totalStaff;
    if (ratio > MAX_CONCURRENT_LEAVE_RATIO) {
      messages.push(
        `${formatKoreanDate(dateISO)}: 동시 휴가 ${onLeaveIds.size}명/${totalStaff}명 ` +
          `(${Math.round(ratio * 100)}%, 기준 ${Math.round(MAX_CONCURRENT_LEAVE_RATIO * 100)}% 초과)`
      );
    }
  }

  return { hasConflict: messages.length > 0, messages };
}
