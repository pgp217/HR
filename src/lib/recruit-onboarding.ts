import type { OnboardingTask } from "./recruit-types";
import { addDays } from "./date";

// offsetDays는 "오늘"이 아니라 후보자의 입사 가능 시기(availableStartDate)
// 기준 상대일이다 — 음수는 입사 전 준비 항목, 0은 입사 당일 항목.
export const ONBOARDING_TASK_TEMPLATE: { title: string; assignee: string; offsetDays: number }[] = [
  { title: "급여계좌 등록", assignee: "정하은", offsetDays: -5 },
  { title: "근로계약서 서명", assignee: "이서연", offsetDays: -5 },
  { title: "사내 계정 발급(이메일·메신저)", assignee: "김민준", offsetDays: -3 },
  { title: "사원증 발급", assignee: "최지우", offsetDays: -2 },
  { title: "장비 지급(노트북 등)", assignee: "박도윤", offsetDays: -2 },
  { title: "신입 교육 일정 안내", assignee: "한소율", offsetDays: 0 },
];

export function createOnboardingTasksForCandidate(
  candidateId: string,
  availableStartDate: string
): OnboardingTask[] {
  const [y, m, d] = availableStartDate.split("-").map(Number);
  const startDate = new Date(y, m - 1, d);
  return ONBOARDING_TASK_TEMPLATE.map((item, i) => ({
    id: `onb-${candidateId}-${i}`,
    candidateId,
    title: item.title,
    assignee: item.assignee,
    dueDate: addDays(startDate, item.offsetDays),
    done: false,
  }));
}
