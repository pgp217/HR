import type { Staff, StaffRole } from "./types";

// 직원 목록/휴가 신청 목록 등에서 공통으로 쓰는 정렬 기준: 1순위 직급
// 높은 순(부장→사원), 2순위 같은 직급 내에서 입사일 빠른 순.
const ROLE_ORDER: Record<StaffRole, number> = {
  부장: 6,
  차장: 5,
  과장: 4,
  대리: 3,
  주임: 2,
  사원: 1,
};

export function compareStaffSeniority(a: Staff, b: Staff): number {
  const roleDiff = ROLE_ORDER[b.role] - ROLE_ORDER[a.role];
  if (roleDiff !== 0) return roleDiff;
  return a.joinedAt < b.joinedAt ? -1 : a.joinedAt > b.joinedAt ? 1 : 0;
}
