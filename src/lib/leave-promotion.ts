// 근로기준법 제61조 연차 유급휴가 사용 촉진 제도.
//
// 근속 1년 이상(1항, 회계연도 관리 — 매년 12/31 만료 기준):
//   1차 촉구: 사용기간이 끝나기 6개월 전을 기준으로 10일 이내(7/1~
//     7/10)에 잔여 일수를 알리고, 근로자가 사용 시기를 정해서 서면
//     통보하도록 촉구한다.
//   2차 통보: 근로자가 촉구를 받은 날로부터 10일 이내에 통보하지
//     않으면, 사용기간이 끝나기 2개월 전(10/31)까지 사용자가 사용
//     시기를 직접 지정해서 서면으로 통보한다.
//
// 근속 1년 미만(2항, 입사일 기준 — 회계연도와 무관하게 매월 개근 시
// 1일씩, 최대 11일 발생): 최초 1년의 근로기간(입사일+1년)이 끝나는
// 날을 기준으로 두 묶음으로 나눠 촉진한다.
//   A묶음(최초 9개월 개근분, 최대 9일): 만료 3개월 전부터 10일 이내
//     1차 촉구 → 촉구 후 10일 이내 미응답 시 만료 1개월 전까지 2차 통보
//   B묶음(10·11개월째 개근분, 최대 2일): 만료 1개월 전부터 5일 이내
//     1차 촉구 → 촉구 후 5일 이내 미응답 시 만료 10일 전까지 2차 통보
//   (이 앱은 어느 날짜분이 A/B 중 무엇에 해당하는지까지 나눠 추적하지
//   않고, 두 촉진 라운드 각각의 촉구·통보 이행 여부만 관리한다.)
//
// 두 조치를 모두 이행했는데도 근로자가 휴가를 쓰지 않아 소멸된 경우,
// 사용자는 미사용 휴가에 대한 수당 지급 의무를 지지 않는다.

export interface LeavePromotionNotice {
  staffId: string;
  year: number;
  // 근속 1년 이상(1항) — 회계연도 기준
  firstNoticeAt?: string; // ISO date, 1차 촉구 발송일
  firstNoticeDays?: number; // 1차 촉구 시점의 잔여 일수(통보 내용 기록용)
  employeeSpecifiedAt?: string; // ISO date, 근로자가 사용 시기를 통보한 날짜
  employeeSpecifiedStart?: string; // ISO date, 근로자가 지정한 사용 시작일
  employeeSpecifiedEnd?: string; // ISO date, 근로자가 지정한 사용 종료일
  employeeLeaveRequestId?: string; // 위 지정 시기로 자동 등록된 휴가 신청 id
  secondNoticeAt?: string; // ISO date, 2차 통보 발송일
  secondNoticeStart?: string; // ISO date, 사용자가 지정한 사용 시작일
  secondNoticeEnd?: string; // ISO date, 사용자가 지정한 사용 종료일
  secondNoticeLeaveRequestId?: string; // 위 지정 시기로 자동 등록된 휴가 신청 id

  // 근속 1년 미만(2항) — 입사일 기준 두 묶음
  underOneYearBatchA?: PromotionBatchNotice;
  underOneYearBatchB?: PromotionBatchNotice;
}

export interface PromotionBatchNotice {
  firstNoticeAt?: string;
  employeeSpecifiedAt?: string;
  employeeSpecifiedStart?: string;
  employeeSpecifiedEnd?: string;
  leaveRequestId?: string;
  secondNoticeAt?: string;
  secondNoticeStart?: string;
  secondNoticeEnd?: string;
  secondLeaveRequestId?: string;
}

export type PromotionStage =
  | "대상아님" // 잔여 연차 0일 이하
  | "1차대기" // 아직 1차 촉구 기간 전
  | "1차대상" // 1차 촉구 기간 진입, 아직 미발송(기한 초과 포함)
  | "근로자응답대기" // 1차 발송 완료, 근로자 응답 대기
  | "2차대상" // 근로자 미응답, 2차 통보 필요
  | "완료"; // 근로자가 사용 시기를 통보했거나 2차 통보까지 완료

interface PromotionWindow {
  firstStart: string; // 1차 촉구 시작일
  firstEnd: string; // 1차 촉구 기한
  employeeRespondDays: number; // 근로자 응답 유예일수(1차 촉구일로부터)
  secondDeadline: string; // 2차 통보 기한
}

interface GenericNotice {
  firstNoticeAt?: string;
  employeeSpecifiedAt?: string;
  secondNoticeAt?: string;
}

export function addDaysToISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addMonthsToISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// 두 ISO 날짜 사이의 일수 차(to - from). 음수면 from이 to보다 나중이라는
// 뜻(이미 지남).
function daysBetweenISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function computeStage(
  todayISO: string,
  eligible: boolean,
  window: PromotionWindow,
  notice: GenericNotice | undefined
): PromotionStage {
  if (!eligible) return "대상아님";
  if (notice?.employeeSpecifiedAt || notice?.secondNoticeAt) return "완료";

  if (!notice?.firstNoticeAt) {
    return todayISO < window.firstStart ? "1차대기" : "1차대상";
  }

  const respondDeadline = addDaysToISO(notice.firstNoticeAt, window.employeeRespondDays);
  if (todayISO <= respondDeadline && todayISO < window.secondDeadline) return "근로자응답대기";
  return "2차대상";
}

export const DUE_SOON_WINDOW_DAYS = 14;

export interface DeadlineInfo {
  label: string; // 예: "D-7", "기한 3일 경과"
  daysLeft: number; // 음수면 이미 지남
  urgent: boolean; // 14일 이내(경과 포함)로 임박했을 때
}

function computeDeadlineInfo(
  todayISO: string,
  stage: PromotionStage,
  window: PromotionWindow,
  notice: GenericNotice | undefined
): DeadlineInfo | null {
  let target: string | null = null;

  if (stage === "1차대상") {
    target = window.firstEnd;
  } else if (stage === "근로자응답대기" && notice?.firstNoticeAt) {
    target = addDaysToISO(notice.firstNoticeAt, window.employeeRespondDays);
  } else if (stage === "2차대상") {
    target = window.secondDeadline;
  }

  if (!target) return null;

  const daysLeft = daysBetweenISO(todayISO, target);
  const label = daysLeft >= 0 ? `D-${daysLeft}` : `기한 ${-daysLeft}일 경과`;
  return { label, daysLeft, urgent: daysLeft <= DUE_SOON_WINDOW_DAYS };
}

// ---------------------------------------------------------------------------
// 근속 1년 이상(1항) — 회계연도 기준
// ---------------------------------------------------------------------------

export function firstNoticeWindow(year: number): { start: string; end: string } {
  return { start: `${year}-07-01`, end: `${year}-07-10` };
}

export function secondNoticeDeadline(year: number): string {
  return `${year}-10-31`;
}

export function leaveYearEnd(year: number): string {
  return `${year}-12-31`;
}

function overOneYearWindow(year: number): PromotionWindow {
  const { start, end } = firstNoticeWindow(year);
  return { firstStart: start, firstEnd: end, employeeRespondDays: 10, secondDeadline: secondNoticeDeadline(year) };
}

export function getPromotionStage(
  todayISO: string,
  year: number,
  remainingDays: number,
  notice: LeavePromotionNotice | undefined
): PromotionStage {
  return computeStage(todayISO, remainingDays > 0, overOneYearWindow(year), notice);
}

/**
 * 현재 stage에서 다음으로 챙겨야 할 기한까지 며칠 남았는지 계산한다.
 * "1차대상"이면 1차 촉구 기한(7/10), "근로자응답대기"면 근로자 응답
 * 기한(1차 발송일+10일), "2차대상"이면 2차 통보 기한(10/31)을 기준으로
 * 삼는다. 그 외 단계(완료/대상아님/1차대기)는 챙길 기한이 없으므로
 * null을 반환한다.
 */
export function getDeadlineInfo(
  todayISO: string,
  year: number,
  stage: PromotionStage,
  notice: LeavePromotionNotice | undefined
): DeadlineInfo | null {
  return computeDeadlineInfo(todayISO, stage, overOneYearWindow(year), notice);
}

// ---------------------------------------------------------------------------
// 근속 1년 미만(2항) — 입사일 기준 A/B 두 묶음
// ---------------------------------------------------------------------------

export type UnderOneYearBatchId = "A" | "B";

/** 묶음별 대상 연차 일수(A: 최초 9개월 개근분, B: 10·11개월째 개근분). */
export const UNDER_ONE_YEAR_BATCH_MAX_DAYS: Record<UnderOneYearBatchId, number> = {
  A: 9,
  B: 2,
};

/** 최초 1년의 근로기간이 끝나는 날(입사일 + 1년). */
export function underOneYearUsageEnd(joinedAt: string): string {
  const [y, m, d] = joinedAt.split("-").map(Number);
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function underOneYearWindow(joinedAt: string, batch: UnderOneYearBatchId): PromotionWindow {
  const usageEnd = underOneYearUsageEnd(joinedAt);
  if (batch === "A") {
    const firstStart = addMonthsToISO(usageEnd, -3);
    return {
      firstStart,
      // "10일 이내"는 시작일을 1일째로 센 10일간(시작일+9일까지)을 뜻한다.
      firstEnd: addDaysToISO(firstStart, 9),
      employeeRespondDays: 10,
      secondDeadline: addMonthsToISO(usageEnd, -1),
    };
  }
  const firstStart = addMonthsToISO(usageEnd, -1);
  return {
    firstStart,
    firstEnd: addDaysToISO(firstStart, 4), // "5일 이내" = 시작일+4일까지
    employeeRespondDays: 5,
    secondDeadline: addDaysToISO(usageEnd, -10),
  };
}

export function getUnderOneYearBatchStage(
  todayISO: string,
  joinedAt: string,
  batch: UnderOneYearBatchId,
  notice: PromotionBatchNotice | undefined
): PromotionStage {
  return computeStage(todayISO, true, underOneYearWindow(joinedAt, batch), notice);
}

export function getUnderOneYearBatchDeadlineInfo(
  todayISO: string,
  joinedAt: string,
  batch: UnderOneYearBatchId,
  stage: PromotionStage,
  notice: PromotionBatchNotice | undefined
): DeadlineInfo | null {
  return computeDeadlineInfo(todayISO, stage, underOneYearWindow(joinedAt, batch), notice);
}
