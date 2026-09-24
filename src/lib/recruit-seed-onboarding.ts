import type { OnboardingTask } from "./recruit-types";
import { addDays } from "./date";

// 백윤결(cand-seed-4, 이미 "합격" 처리됨, 입사 가능 시기 2026-11-24)의
// 온보딩 체크리스트. createOnboardingTasksForCandidate()와 같은 기준
// (입사일 기준 상대일)으로 날짜를 맞추고, 그중 두 건만 미리 완료된
// 것으로 표시해 진행률이 바로 보이게 했다.
const startDate = new Date(2026, 10, 24); // 백윤결의 availableStartDate

export const seedOnboardingTasks: OnboardingTask[] = [
  {
    id: "onb-cand-seed-4-0",
    candidateId: "cand-seed-4",
    title: "급여계좌 등록",
    assignee: "정하은",
    dueDate: addDays(startDate, -5),
    done: true,
  },
  {
    id: "onb-cand-seed-4-1",
    candidateId: "cand-seed-4",
    title: "근로계약서 서명",
    assignee: "이서연",
    dueDate: addDays(startDate, -5),
    done: true,
  },
  {
    id: "onb-cand-seed-4-2",
    candidateId: "cand-seed-4",
    title: "사내 계정 발급(이메일·메신저)",
    assignee: "김민준",
    dueDate: addDays(startDate, -3),
    done: false,
  },
  {
    id: "onb-cand-seed-4-3",
    candidateId: "cand-seed-4",
    title: "사원증 발급",
    assignee: "최지우",
    dueDate: addDays(startDate, -2),
    done: false,
  },
  {
    id: "onb-cand-seed-4-4",
    candidateId: "cand-seed-4",
    title: "장비 지급(노트북 등)",
    assignee: "박도윤",
    dueDate: addDays(startDate, -2),
    done: false,
  },
  {
    id: "onb-cand-seed-4-5",
    candidateId: "cand-seed-4",
    title: "신입 교육 일정 안내",
    assignee: "한소율",
    dueDate: addDays(startDate, 0),
    done: false,
  },
];
