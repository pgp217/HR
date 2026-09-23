// 근로기준법 제61조 연차 유급휴가 사용 촉진 제도.
//   1차 촉구: 휴가 사용기간(매년 12/31 만료 기준)이 끝나기 6개월 전을
//     기준으로 10일 이내(7/1~7/10)에 근로자별 잔여 휴가 일수를 알리고,
//     근로자가 사용 시기를 정해서 서면으로 통보하도록 촉구한다.
//   2차 통보: 근로자가 촉구를 받은 날로부터 10일 이내에 사용 시기를
//     통보하지 않으면, 사용기간이 끝나기 2개월 전(10/31)까지 사용자가
//     사용 시기를 직접 지정해서 서면으로 통보한다.
// 두 조치를 모두 이행했는데도 근로자가 휴가를 쓰지 않아 소멸된 경우,
// 사용자는 미사용 휴가에 대한 수당 지급 의무를 지지 않는다.
//
// 이 앱은 근속 1년 미만 근로자의 월 단위 개별 만료 촉진(제61조 2항,
// 3개월 전/1개월 전 기준)은 별도로 모델링하지 않고, 모든 대상자에게
// 1년 이상 근속자 기준(6개월 전/2개월 전)을 동일하게 적용한다.

export interface LeavePromotionNotice {
  staffId: string;
  year: number;
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
}

export type PromotionStage =
  | "대상아님" // 잔여 연차 0일 이하
  | "1차대기" // 아직 1차 촉구 기간(7/1) 전
  | "1차대상" // 1차 촉구 기간 진입, 아직 미발송(기한 초과 포함)
  | "근로자응답대기" // 1차 발송 완료, 근로자 응답 대기(10일 이내)
  | "2차대상" // 근로자 미응답, 2차 통보 필요
  | "완료"; // 근로자가 사용 시기를 통보했거나 2차 통보까지 완료

export function firstNoticeWindow(year: number): { start: string; end: string } {
  return { start: `${year}-07-01`, end: `${year}-07-10` };
}

export function secondNoticeDeadline(year: number): string {
  return `${year}-10-31`;
}

export function leaveYearEnd(year: number): string {
  return `${year}-12-31`;
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

export function getPromotionStage(
  todayISO: string,
  year: number,
  remainingDays: number,
  notice: LeavePromotionNotice | undefined
): PromotionStage {
  if (remainingDays <= 0) return "대상아님";
  if (notice?.employeeSpecifiedAt || notice?.secondNoticeAt) return "완료";

  const { start: firstStart } = firstNoticeWindow(year);
  const secondDeadline = secondNoticeDeadline(year);

  if (!notice?.firstNoticeAt) {
    return todayISO < firstStart ? "1차대기" : "1차대상";
  }

  const respondDeadline = addDaysToISO(notice.firstNoticeAt, 10);
  if (todayISO <= respondDeadline && todayISO < secondDeadline) return "근로자응답대기";
  return "2차대상";
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

export const DUE_SOON_WINDOW_DAYS = 14;

export interface DeadlineInfo {
  label: string; // 예: "D-7", "기한 3일 경과"
  daysLeft: number; // 음수면 이미 지남
  urgent: boolean; // 14일 이내(경과 포함)로 임박했을 때
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
  let target: string | null = null;

  if (stage === "1차대상") {
    target = firstNoticeWindow(year).end;
  } else if (stage === "근로자응답대기" && notice?.firstNoticeAt) {
    target = addDaysToISO(notice.firstNoticeAt, 10);
  } else if (stage === "2차대상") {
    target = secondNoticeDeadline(year);
  }

  if (!target) return null;

  const daysLeft = daysBetweenISO(todayISO, target);
  const label = daysLeft >= 0 ? `D-${daysLeft}` : `기한 ${-daysLeft}일 경과`;
  return { label, daysLeft, urgent: daysLeft <= DUE_SOON_WINDOW_DAYS };
}
