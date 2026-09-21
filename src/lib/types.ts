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
