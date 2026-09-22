export type StaffRole = "담당자" | "서무";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  joinedAt: string; // ISO date
}

export type LeaveType = "연차" | "반차(오전)" | "반차(오후)" | "경조사" | "병가";

export type LeaveStatus = "승인대기" | "승인" | "반려";

export interface LeaveGrant {
  staffId: string;
  year: number;
  granted: number; // 부여
  carryover: number; // 이월
  adjustment: number; // 조정 (+/-)
}

export interface DutyPolicy {
  weekendIncluded: boolean; // 당직 - 주말 포함
  holidayIncluded: boolean; // 당직 - 공휴일 포함 (공휴일 데이터 연동 전까지는 저장만 됨)
  autoExcludeOnLeave: boolean; // 휴가자 자동 제외
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

// 출장·외출은 휴가와 달리 승인 절차 없이 등록 즉시 보고 완료로 처리한다
// (실무에서도 사전 승인보다는 사후 공유 성격이 강한 항목이라 워크플로를
// 단순하게 유지).
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
  requestedAt: string; // ISO date
}
