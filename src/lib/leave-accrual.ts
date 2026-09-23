import type { Staff } from "./types";

// 근로기준법 제60조 기준 연차 자동 발생 계산.
//   - 근속 1년 미만(2항): 입사 후 매달 개근 시 1일씩 발생 (최대 11일)
//   - 근속 1년 이상(1항): 직전 1년간 출근율 80% 이상이면 기본 15일 +
//     (근속연수-1)을 2로 나눈 몫만큼 가산, 최대 25일. 80% 미만이면
//     1년 미만과 동일하게 개근 월 1일씩 산정
//   - 상시근로자 수 5명 미만이면 연차 규정 자체가 적용되지 않음(0일)
//
// 2항(최대 11일)과 1항(15일+)은 서로 다른 조문에서 발생하는 별개의
// 연차라서, 입사 1주년이 지났다고 2항 특례분이 사라지는 게 아니라
// 1항 정기 연차가 그 위에 "추가로" 얹힌다 — 1주년이 속한 회계연도에는
// 그 해에 새로 채워진 2항 잔여분 + 1항 정기분을 합산해서 발생시킨다.
// (예: 7/1 입사자는 1주년 전까지 2항으로 11일을 다 채우고, 1주년 이후
// 1항으로 15일이 추가 발생 — 그 전환이 걸친 회계연도에는 두 항의
// 그 해 몫을 더한 값이 그 해의 발생일수가 된다.)
//
// 이 앱은 출근(결근) 이력을 별도로 추적하지 않으므로, 출근율은 전 직원
// 80% 이상(정상 출근)으로 가정한다 — 즉 80% 미만 분기는 항상 스킵된다.
// 실제 결근 데이터를 쌓는 기능이 생기면 그때 이 가정을 걷어내면 된다.

export const MIN_STAFF_FOR_LEAVE_LAW = 5;
const FIRST_YEAR_SPECIAL_MAX = 11;

export interface AccrualResult {
  days: number; // 해당 연도에 새로 발생한 총 일수 (specialDays + regularDays)
  tenureYears: number; // 기준일 시점 만 근속연수(내림)
  isFirstYearSpecial: boolean; // 이 연도가 전부 2항 특례로만 이루어졌는지(1주년 전)
  specialDays: number; // 이 연도에 새로 발생한 2항 특례(최대 11일) 몫
  regularDays: number; // 이 연도에 새로 발생한 1항 정기(15일+가산) 몫
}

export function tenureYearsAt(joinedAt: string, asOfISO: string): number {
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
  return Math.max(0, Math.min(FIRST_YEAR_SPECIAL_MAX, months));
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
  year: number,
  asOfISO: string,
  totalStaffCount: number
): AccrualResult {
  if (totalStaffCount < MIN_STAFF_FOR_LEAVE_LAW) {
    return { days: 0, tenureYears: 0, isFirstYearSpecial: false, specialDays: 0, regularDays: 0 };
  }

  const tenureYears = tenureYearsAt(staff.joinedAt, asOfISO);

  // 이 연도에 "새로" 채워진 2항 특례 일수만 계산 — 작년 말까지 이미
  // 채워진 분은 작년 몫으로 이미 발생 처리됐으므로 제외한다. 근속이
  // 이미 1년을 넘긴 지 오래된 직원은 두 값이 똑같이 11(상한)이라 항상
  // 0이 나오고, 순수 1년 미만인 해는 작년 말 기준값이 자동으로 0이라
  // 그 해 누적치가 그대로 나온다.
  const specialByThisYearEnd = monthsCompletedAt(staff.joinedAt, asOfISO);
  const specialByPriorYearEnd = monthsCompletedAt(staff.joinedAt, `${year - 1}-12-31`);
  const specialDays = Math.max(0, specialByThisYearEnd - specialByPriorYearEnd);

  const regularDays =
    tenureYears >= 1 ? Math.min(15 + Math.floor((tenureYears - 1) / 2), 25) : 0;

  return {
    days: specialDays + regularDays,
    tenureYears,
    isFirstYearSpecial: tenureYears < 1,
    specialDays,
    regularDays,
  };
}
