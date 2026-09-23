import type { Staff } from "./types";

// 근로기준법 제60조 기준 연차 자동 발생 계산.
//   - 근속 1년 미만: 입사 후 매달 개근 시 1일씩 발생 (최대 11일)
//   - 근속 1년 이상: 직전 1년간 출근율 80% 이상이면 기본 15일 +
//     (근속연수-1)을 2로 나눈 몫만큼 가산, 최대 25일. 80% 미만이면
//     1년 미만과 동일하게 개근 월 1일씩 산정
//   - 상시근로자 수 5명 미만이면 연차 규정 자체가 적용되지 않음(0일)
//
// 이 앱은 출근(결근) 이력을 별도로 추적하지 않으므로, 출근율은 전 직원
// 80% 이상(정상 출근)으로 가정한다 — 즉 80% 미만 분기는 항상 스킵된다.
// 실제 결근 데이터를 쌓는 기능이 생기면 그때 이 가정을 걷어내면 된다.

export const MIN_STAFF_FOR_LEAVE_LAW = 5;

export interface AccrualResult {
  days: number;
  tenureYears: number; // 기준일 시점 만 근속연수(내림)
  isFirstYearSpecial: boolean; // 1년 미만 특례(개근 월 1일) 적용 여부
}

function tenureYearsAt(joinedAt: string, asOfISO: string): number {
  const [jy, jm, jd] = joinedAt.split("-").map(Number);
  const [ay, am, ad] = asOfISO.split("-").map(Number);
  let years = ay - jy;
  if (am < jm || (am === jm && ad < jd)) years -= 1;
  return Math.max(0, years);
}

function monthsCompletedAt(joinedAt: string, asOfISO: string): number {
  const [jy, jm, jd] = joinedAt.split("-").map(Number);
  const [ay, am, ad] = asOfISO.split("-").map(Number);
  let months = (ay - jy) * 12 + (am - jm);
  if (ad < jd) months -= 1;
  return Math.max(0, Math.min(11, months));
}

/** 연도의 연차 발생을 계산할 기준일. 지난 연도는 그 해 말, 진행 중인 연도는 오늘, 미래 연도는 그 해 초로 고정한다. */
export function accrualAsOfDateForYear(year: number, todayISO: string): string {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  if (todayISO < yearStart) return yearStart;
  if (todayISO > yearEnd) return yearEnd;
  return todayISO;
}

export function computeAnnualLeaveDays(
  staff: Staff,
  asOfISO: string,
  totalStaffCount: number
): AccrualResult {
  if (totalStaffCount < MIN_STAFF_FOR_LEAVE_LAW) {
    return { days: 0, tenureYears: 0, isFirstYearSpecial: false };
  }

  const tenureYears = tenureYearsAt(staff.joinedAt, asOfISO);

  if (tenureYears < 1) {
    return { days: monthsCompletedAt(staff.joinedAt, asOfISO), tenureYears, isFirstYearSpecial: true };
  }

  const bonus = Math.floor((tenureYears - 1) / 2);
  return { days: Math.min(15 + bonus, 25), tenureYears, isFirstYearSpecial: false };
}
