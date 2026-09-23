import type { LeaveType } from "./types";

// 반차의 실제 시간대를 화면에 노출하기 위한 고정 시간대. 회사 표준 근무
// 시간(09:00~18:00, 점심 제외)을 오전/오후로 절반씩 나눈 값이다.
export const HALF_DAY_TIME_RANGES: Partial<Record<LeaveType, { start: string; end: string }>> = {
  "반차(오전)": { start: "09:00", end: "13:00" },
  "반차(오후)": { start: "13:00", end: "18:00" },
};

/** 반차면 "반차(오후) 13:00~18:00"처럼 시간대를 붙이고, 아니면 종류만 그대로 반환한다. */
export function formatLeaveTypeLabel(type: LeaveType): string {
  const range = HALF_DAY_TIME_RANGES[type];
  return range ? `${type} ${range.start}~${range.end}` : type;
}

/** 표에서 종류/시간대를 두 줄로 나눠 보여줄 때 쓰는 버전. 반차가 아니면 시간대 줄은 없다. */
export function formatLeaveTypeParts(type: LeaveType): { label: string; time?: string } {
  const range = HALF_DAY_TIME_RANGES[type];
  return range ? { label: type, time: `${range.start}~${range.end}` } : { label: type };
}

/** "HH:mm" 문자열을 시각순으로 비교하기 위한 헬퍼(사전순 비교로 충분). */
export function isNowWithin(nowHHmm: string, start: string, end: string): boolean {
  return nowHHmm >= start && nowHHmm < end;
}
