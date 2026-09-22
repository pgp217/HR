import type { OnboardingTask } from "./recruit-types";
import { addDays, today } from "./date";

export const ONBOARDING_TASK_TEMPLATE: { title: string; assignee: string; offsetDays: number }[] = [
  { title: "급여계좌 등록", assignee: "정하은", offsetDays: 1 },
  { title: "근로계약서 서명", assignee: "이서연", offsetDays: 2 },
  { title: "사내 계정 발급(이메일·메신저)", assignee: "김민준", offsetDays: 3 },
  { title: "사원증 발급", assignee: "최지우", offsetDays: 4 },
  { title: "장비 지급(노트북 등)", assignee: "박도윤", offsetDays: 5 },
  { title: "신입 교육 일정 안내", assignee: "한소율", offsetDays: 7 },
];

export function createOnboardingTasksForCandidate(candidateId: string): OnboardingTask[] {
  const t = today();
  return ONBOARDING_TASK_TEMPLATE.map((item, i) => ({
    id: `onb-${candidateId}-${i}`,
    candidateId,
    title: item.title,
    assignee: item.assignee,
    dueDate: addDays(t, item.offsetDays),
    done: false,
  }));
}
