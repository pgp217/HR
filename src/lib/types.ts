export type StaffRole = "사원" | "주임" | "대리" | "과장" | "차장" | "부장";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  joinedAt: string; // ISO date
}

export type LeaveType = "연차" | "반차(오전)" | "반차(오후)" | "경조사" | "병가";

export type LeaveStatus = "승인대기" | "승인" | "반려";

// 연차 부여(granted)일수는 근로기준법 제60조 기준으로 시스템이 자동
// 계산한다(computeAnnualLeaveDays 참고) — 그래서 이 레코드는 사람이
// 직접 입력해야 하는 이월/조정 값만 담는다.
export interface LeaveGrant {
  staffId: string;
  year: number;
  carryover: number; // 이월
  adjustment: number; // 조정 (+/-)
}

export interface DutyPolicy {
  weekendIncluded: boolean; // 당직 - 주말 포함
  holidayIncluded: boolean; // 당직 - 공휴일 포함 (공휴일 데이터 연동 전까지는 저장만 됨)
  autoExcludeOnLeave: boolean; // 휴가자 자동 제외
  excludeEntryLevel: boolean; // 사원 제외 (자동 배정 대상에서 제외)
  excludeDeptHead: boolean; // 부장 제외 (자동 배정 대상에서 제외)
  selectionDeadline: string; // 당일 선택 마감 (HH:mm)
}

export interface DutyRotationEntry {
  staffId: string;
  order: number;
  active: boolean;
  excludeStart?: string; // ISO date, 제외 시작
  excludeEnd?: string; // ISO date, 제외 종료
  memo?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  type: LeaveType;
  startDate: string; // ISO date
  endDate: string; // ISO date
  days: number; // 차감 일수
  reason: string;
  handoverStaffId: string; // 업무 인수인계자
  emergencyContact: string; // 긴급연락처
  status: LeaveStatus;
  requestedAt: string; // ISO date
  decidedAt?: string; // ISO date
  decidedBy?: string;
}

export type TripType = "출장" | "외출";

export type TripStatus = "승인대기" | "승인" | "반려";

// 휴가·연차와 동일하게 승인/반려/삭제로 관리한다 — 등록하면 승인대기
// 상태로 들어가고, 승인권자가 승인/반려를 처리한다.
export interface TripRecord {
  id: string;
  staffId: string;
  type: TripType;
  startDate: string; // ISO date
  endDate: string; // ISO date (외출은 보통 당일이라 startDate와 동일)
  startTime?: string; // HH:mm, 외출에서만 사용
  endTime?: string; // HH:mm, 외출에서만 사용
  purpose: string; // 목적지·사유
  reachable: boolean; // 연락 가능 여부
  status: TripStatus;
  requestedAt: string; // ISO date
  decidedAt?: string; // ISO date
  decidedBy?: string;
}
