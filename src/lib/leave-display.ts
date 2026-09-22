import type { LeaveType } from "./types";

// 반차의 실제 시간대를 화면에 노출하기 위한 고정 시간대. 회사 표준 근무
// 시간(09:00~18:00, 점심 제외)을 오전/오후로 절반씩 나눈 값이다.
export const HALF_DAY_TIME_RANGES: Partial<Record<LeaveType, string>> = {
  "반차(오전)": "09:00~13:00",
  "반차(오후)": "13:00~18:00",
};

/** 반차면 "반차(오후) 13:00~18:00"처럼 시간대를 붙이고, 아니면 종류만 그대로 반환한다. */
export function formatLeaveTypeLabel(type: LeaveType): string {
  const range = HALF_DAY_TIME_RANGES[type];
  return range ? `${type} ${range}` : type;
}
