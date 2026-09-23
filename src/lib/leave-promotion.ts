// 근로기준법 제61조 연차 유급휴가 사용 촉진 제도.
//   1차 촉구: 휴가 사용기간(매년 12/31 만료 기준)이 끝나기 6개월 전을
//     기준으로 10일 이내(7/1~7/10)에 근로자별 잔여 휴가 일수를 알리고,
//     근로자가 사용 시기를 정해서 서면으로 통보하도록 촉구한다.
//   2차 통보: 근로자가 촉구를 받은 날로부터 10일 이내에 사용 시기를
//     통보하지 않으면, 사용기간이 끝나기 2개월 전(11/1)까지 사용자가
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
  employeeSpecifiedDates?: string; // 근로자가 통보한 사용 시기(자유 텍스트)
  secondNoticeAt?: string; // ISO date, 2차 통보 발송일
  secondNoticeDates?: string; // 사용자가 지정한 사용 시기(자유 텍스트)
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
  return `${year}-11-01`;
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
