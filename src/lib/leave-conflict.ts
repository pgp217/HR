import type { LeaveRequest, Staff, StaffRole } from "./types";
import { isWithinRange, toISODate, formatKoreanDate } from "./date";

// 같은 날 여러 명이 휴가를 신청해 인원이 몰릴 때를 대비한 정책. 두 기준을
// 함께 적용하고, 하나라도 걸리면 경고만 한다 — 강제로 승인을 막지는 않고,
// 최종 판단은 승인권자가 직접 하도록 남겨둔다.
//   1) 그룹별 최소 근무 인원 비율: 직급(사원~부장)을 "주니어(사원~대리)"
//      / "시니어(과장~부장)" 두 그룹으로 묶어서, 그룹 인원 대비 남는
//      인원의 비율이 기준 밑으로 내려가면 경고 (시니어는 인원의 40%
//      이상, 주니어는 인원의 30% 이상 근무 유지 — 직급 자체가 세분화돼
//      있어 개별 직급 단위로는 커버리지 규칙을 두지 않고 선임/주니어
//      단위로만 적용한다). 인원이 늘거나 줄어도 비율 기준이라 자동으로
//      따라간다 — 최소 인원 수는 올림(ceil) 처리해서 "비율 이상"을
//      항상 만족시킨다.
//   2) 전체 인원 대비 동시 휴가 비율: 직급 구분 없이 전체 직원 중 동시
//      휴가자가 기준 비율을 넘으면 경고 (30%)
//
// checkLeaveConflict는 "이 신청을 승인하면"을 가정해 앞으로 벌어질 위반을
// 미리 경고하는 용도(승인 버튼 클릭 시점)이고, checkStaffingOnDate는 이미
// 승인된 상태(과거 시드 데이터처럼 승인 절차 없이 들어온 데이터 포함)를
// 특정 날짜 기준으로 그대로 검사하는 용도다 — "오늘 현황" 같은 화면에서
// 상시로 위반 여부를 보여줄 때 쓴다.

type StaffGroup = "주니어" | "시니어";

const ROLE_GROUP: Record<StaffRole, StaffGroup> = {
  사원: "주니어",
  주임: "주니어",
  대리: "주니어",
  과장: "시니어",
  차장: "시니어",
  부장: "시니어",
};

const GROUP_LABEL: Record<StaffGroup, string> = {
  주니어: "주니어(사원~대리)",
  시니어: "시니어(과장~부장)",
};

export const GROUP_MIN_STAFF_RATIO: Record<StaffGroup, number> = {
  주니어: 0.3,
  시니어: 0.4,
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

function evaluateStaffingForDate(
  dateISO: string,
  onLeaveIds: Set<string>,
  staffList: Staff[]
): string[] {
  const messages: string[] = [];
  const staffById = new Map(staffList.map((s) => [s.id, s]));
  const groupTotals = new Map<StaffGroup, number>();
  for (const s of staffList) {
    const group = ROLE_GROUP[s.role];
    groupTotals.set(group, (groupTotals.get(group) ?? 0) + 1);
  }

  const groupOnLeave = new Map<StaffGroup, number>();
  for (const id of onLeaveIds) {
    const staff = staffById.get(id);
    if (!staff) continue;
    const group = ROLE_GROUP[staff.role];
    groupOnLeave.set(group, (groupOnLeave.get(group) ?? 0) + 1);
  }

  for (const [group, total] of groupTotals) {
    const onLeave = groupOnLeave.get(group) ?? 0;
    const remaining = total - onLeave;
    const ratio = GROUP_MIN_STAFF_RATIO[group] ?? 0;
    const min = Math.ceil(ratio * total);
    if (remaining < min) {
      messages.push(
        `${formatKoreanDate(dateISO)}: ${GROUP_LABEL[group]} 근무 인원 ${remaining}명 ` +
          `(최소 ${min}명, 인원의 ${Math.round(ratio * 100)}% 필요)`
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

  return messages;
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
  const approvedOthers = allRequests.filter(
    (r) => r.status === "승인" && r.id !== candidateRequest.id
  );

  const messages: string[] = [];
  for (const dateISO of datesInRange(candidateRequest.startDate, candidateRequest.endDate)) {
    const onLeaveIds = new Set<string>([candidateRequest.staffId]);
    for (const r of approvedOthers) {
      if (isWithinRange(dateISO, r.startDate, r.endDate)) onLeaveIds.add(r.staffId);
    }
    messages.push(...evaluateStaffingForDate(dateISO, onLeaveIds, staffList));
  }

  return { hasConflict: messages.length > 0, messages };
}

/**
 * 특정 날짜에 이미 승인된 휴가만으로 최소 근무 인원 기준을 위반하는지
 * 검사한다. 승인 버튼을 거치지 않고 들어온 데이터(시드 데이터 등)도
 * 포함해서, 그 날짜의 실제 근무 인원 현황을 그대로 검사한다.
 */
export function checkStaffingOnDate(
  dateISO: string,
  allRequests: LeaveRequest[],
  staffList: Staff[]
): LeaveConflictResult {
  const onLeaveIds = new Set<string>();
  for (const r of allRequests) {
    if (r.status === "승인" && isWithinRange(dateISO, r.startDate, r.endDate)) {
      onLeaveIds.add(r.staffId);
    }
  }
  const messages = evaluateStaffingForDate(dateISO, onLeaveIds, staffList);
  return { hasConflict: messages.length > 0, messages };
}
