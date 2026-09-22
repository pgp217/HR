import type { Candidate, JobPosting } from "./recruit-types";
import { EXPERIENCE_RANGES, EMPLOYMENT_STATUSES } from "./recruit-options";

// 지원자 적합도 점수 (0~100). 세 축으로 나눠 합산한다:
//   경력(20) + 역량 레벨(30) + 희망 직무 적합도(50)
// 자격증/보유 스킬은 직무마다 유효성이 크게 갈려 정량화가 애매하다고 판단해
// 의도적으로 제외했다 — 대신 실무에서 비교적 명확한 기준(연차, 어학/엑셀
// 레벨, 현재 채용 공고와의 매칭)만 사용한다. 경력보다 "지금 채용 중인
// 자리와 얼마나 맞는가"를 훨씬 더 중요하게 본다.

const EXPERIENCE_SCORES: Record<(typeof EXPERIENCE_RANGES)[number], number> = {
  "신입": 4,
  "1년 미만": 6,
  "1~3년": 9,
  "3~5년": 11,
  "5~7년": 13,
  "7~10년": 15,
  "10년 이상": 15,
};

// 즉시 투입 가능성: 무직/퇴사 상태는 별도 조율 없이 바로 입사 가능하다고 보고
// 소폭의 가산점을 준다. 재직중이라고 감점하는 게 아니라, 즉시 가능한 쪽에
// "추가"로 점수를 주는 방식이라 재직중인 지원자도 최저점(2점)은 보장된다.
const AVAILABILITY_SCORES: Record<(typeof EMPLOYMENT_STATUSES)[number], number> = {
  "재직중": 2,
  "퇴사": 4,
  "무직": 5,
};

const MAX_EXPERIENCE_SCORE = 15;
const MAX_AVAILABILITY_SCORE = 5;
const MAX_SKILL_LEVEL_SCORE = 15; // 어학, 엑셀 각각
const MAX_ROLE_MATCH_SCORE = 50;
const CLOSED_ROLE_MATCH_SCORE = 25; // 마감된 공고와만 일치
const NO_ROLE_MATCH_SCORE = 5; // 관련 공고 자체가 없음 — 기본점

export interface FitScoreBreakdown {
  experience: number; // 0~15
  availability: number; // 0~5
  english: number; // 0~15
  excel: number; // 0~15
  roleMatch: number; // 0~50
  total: number; // 0~100
}

function roleMatchScore(desiredRole: string, postings: JobPosting[]): number {
  if (!desiredRole) return NO_ROLE_MATCH_SCORE;
  const matches = postings.filter((p) => p.role === desiredRole);
  if (matches.length === 0) return NO_ROLE_MATCH_SCORE;
  if (matches.some((p) => p.status === "모집중")) return MAX_ROLE_MATCH_SCORE; // 현재 모집중인 공고와 일치
  return CLOSED_ROLE_MATCH_SCORE; // 과거/마감된 공고와만 일치
}

export function computeFitScore(candidate: Candidate, postings: JobPosting[]): FitScoreBreakdown {
  const experience = EXPERIENCE_SCORES[candidate.totalExperience as never] ?? 0;
  const availability = AVAILABILITY_SCORES[candidate.employmentStatus as never] ?? 0;
  const english = Math.round(((candidate.englishLevel ?? 0) / 5) * MAX_SKILL_LEVEL_SCORE);
  const excel = Math.round(((candidate.excelLevel ?? 0) / 5) * MAX_SKILL_LEVEL_SCORE);
  const roleMatch = roleMatchScore(candidate.desiredRole, postings);

  return {
    experience,
    availability,
    english,
    excel,
    roleMatch,
    total: experience + availability + english + excel + roleMatch,
  };
}

// 60점 미만은 "탈락 대상"으로 명단에 표시만 한다. 전형 단계는 자동으로
// 바꾸지 않는다 — 최종 불합격 처리는 담당자가 직접 판단해서 수동으로
// 변경하도록 의도적으로 분리했다.
export const FAIL_THRESHOLD = 60;

export const FIT_SCORE_MAX = {
  experience: MAX_EXPERIENCE_SCORE,
  availability: MAX_AVAILABILITY_SCORE,
  english: MAX_SKILL_LEVEL_SCORE,
  excel: MAX_SKILL_LEVEL_SCORE,
  roleMatch: MAX_ROLE_MATCH_SCORE,
};
