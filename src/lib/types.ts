export type StaffRole = "담당자" | "서무";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  joinedAt: string; // ISO date
}

export type LeaveType = "연차" | "반차(오전)" | "반차(오후)" | "경조사" | "병가";

export type LeaveStatus = "승인대기" | "승인" | "반려";

export interface LeaveBalance {
  staffId: string;
  grantedDays: number; // 올해 발생 연차
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
