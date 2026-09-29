// 노쇼 방지 알림 자동화 (근거: 면접 예정자 대상 D-3/D-1 통보).
//   D-3: 문자·이메일로 일시/장소/준비물 안내를 자동 발송한다(이 앱은 실제
//     발송 연동이 없어 "발송" 버튼을 누르면 발송 시각만 기록하는 것으로
//     시뮬레이션한다).
//   D-1: 유선 리마인드콜을 보내고, 응답 여부를 체크한다. 응답이 없으면
//     자동으로 "노쇼위험"으로 표시하고, 대기명단(waitlist) 후보로 그
//     슬롯을 대신 채우자고 제안한다.

export type NoticeStage = "예정" | "D-3대상" | "대기" | "D-1대상" | "노쇼위험" | "응답완료";

export interface InterviewNotice {
  candidateId: string;
  d3SentAt?: string; // ISO datetime
  d1SentAt?: string; // ISO datetime
  respondedAt?: string; // ISO datetime, 근로자(지원자) 응답 확인됨
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 면접일까지 남은 일수(daysUntil)로 상태를 정한다.
 *   daysUntil > 3       : 예정 (아직 D-3 전)
 *   1 < daysUntil <= 3  : D-3대상(안 보냈으면) / 대기(D-3까지 보내고 D-1
 *                         기간이 아직 안 왔으면)
 *   daysUntil <= 1      : D-1대상(안 보냈으면) / 보냈는데 응답 없으면
 *                         "노쇼위험"
 */
export function getNoticeStage(
  todayISO: string,
  interviewDateISO: string,
  notice: InterviewNotice | undefined
): NoticeStage {
  if (notice?.respondedAt) return "응답완료";
  const daysUntil = daysBetween(todayISO, interviewDateISO);

  if (daysUntil <= 1) {
    return notice?.d1SentAt ? "노쇼위험" : "D-1대상";
  }
  if (daysUntil <= 3) {
    return notice?.d3SentAt ? "대기" : "D-3대상";
  }
  return "예정";
}

export interface DeadlineInfo {
  label: string; // "D-2", "면접 당일", "기한 1일 경과"
  daysLeft: number;
  urgent: boolean;
}

export function getDeadlineInfo(todayISO: string, interviewDateISO: string): DeadlineInfo {
  const daysLeft = daysBetween(todayISO, interviewDateISO);
  let label: string;
  if (daysLeft === 0) label = "면접 당일";
  else if (daysLeft > 0) label = `D-${daysLeft}`;
  else label = `기한 ${-daysLeft}일 경과`;
  return { label, daysLeft, urgent: daysLeft <= 1 };
}
