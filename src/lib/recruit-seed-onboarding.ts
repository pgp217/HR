import type { OnboardingTask } from "./recruit-types";
import { addDays, today } from "./date";

const t = today();

// 남궁태윤(cand-seed-3, 이미 "합격" 처리됨)의 온보딩 체크리스트.
// 완료/예정/지연 상태를 섞어서 진행률·지연 강조가 바로 보이도록 구성.
export const seedOnboardingTasks: OnboardingTask[] = [
  {
    id: "onb-cand-seed-3-0",
    candidateId: "cand-seed-3",
    title: "급여계좌 등록",
    assignee: "정하은",
    dueDate: addDays(t, -1), // 기한 지남, 미완료 → 지연
    done: false,
  },
  {
    id: "onb-cand-seed-3-1",
    candidateId: "cand-seed-3",
    title: "근로계약서 서명",
    assignee: "이서연",
    dueDate: addDays(t, -2),
    done: true, // 완료됨
  },
  {
    id: "onb-cand-seed-3-2",
    candidateId: "cand-seed-3",
    title: "사내 계정 발급(이메일·메신저)",
    assignee: "김민준",
    dueDate: addDays(t, 2),
    done: false,
  },
  {
    id: "onb-cand-seed-3-3",
    candidateId: "cand-seed-3",
    title: "사원증 발급",
    assignee: "최지우",
    dueDate: addDays(t, -3),
    done: true, // 완료됨
  },
  {
    id: "onb-cand-seed-3-4",
    candidateId: "cand-seed-3",
    title: "장비 지급(노트북 등)",
    assignee: "박도윤",
    dueDate: addDays(t, 4),
    done: false,
  },
  {
    id: "onb-cand-seed-3-5",
    candidateId: "cand-seed-3",
    title: "신입 교육 일정 안내",
    assignee: "한소율",
    dueDate: addDays(t, 7),
    done: false,
  },
];
