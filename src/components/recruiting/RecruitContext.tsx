"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type {
  Candidate,
  CandidateInput,
  JobPosting,
  OnboardingTask,
  RecruitStage,
} from "@/lib/recruit-types";
import { jobPostings } from "@/lib/recruit-postings";
import { PINNED_TODAY_INTERVIEW_IDS, seedCandidates } from "@/lib/recruit-seed-candidates";
import { seedOnboardingTasks } from "@/lib/recruit-seed-onboarding";
import { createOnboardingTasksForCandidate } from "@/lib/recruit-onboarding";
import { readLocalStorage, writeLocalStorage } from "@/lib/storage";
import {
  generateSchedule,
  removeAndCompactAssignment,
  replaceAssignmentCandidate,
  type InterviewAssignment,
} from "@/lib/interview-scheduling";
import type { InterviewNotice } from "@/lib/interview-noshow";

const CANDIDATES_KEY = "hr-recruit-candidates";
const ONBOARDING_KEY = "hr-recruit-onboarding-tasks";
const INTERVIEW_ASSIGNMENTS_KEY = "hr-recruit-interview-assignments";
const INTERVIEW_NOTICES_KEY = "hr-recruit-interview-notices";

interface RecruitContextValue {
  candidates: Candidate[];
  jobPostings: JobPosting[];
  onboardingTasks: OnboardingTask[];
  interviewAssignments: InterviewAssignment[];
  interviewNotices: InterviewNotice[];
  addCandidate: (input: CandidateInput) => void;
  updateCandidateStage: (id: string, stage: RecruitStage, interviewAt?: string) => void;
  toggleOnboardingTask: (taskId: string) => void;
  updateOnboardingTask: (taskId: string, patch: Partial<Pick<OnboardingTask, "assignee" | "dueDate">>) => void;
  ensureOnboardingTasks: (candidateId: string) => void;
  runAutoAssign: (internalNames: string[], externalNames: string[]) => void;
  sendD3Notice: (candidateId: string) => void;
  sendD1Notice: (candidateId: string) => void;
  recordNoticeResponse: (candidateId: string) => void;
  markNoShowAndReshuffle: (candidateId: string) => void;
  reassignFromWaitlist: (riskyCandidateId: string, waitlistCandidateId: string) => void;
}

const RecruitContext = createContext<RecruitContextValue | null>(null);

export function RecruitProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
  const [interviewAssignments, setInterviewAssignments] = useState<InterviewAssignment[]>([]);
  const [interviewNotices, setInterviewNotices] = useState<InterviewNotice[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage only after mount so the server-rendered HTML and
  // the first client render match (avoids hydration mismatches). This is a
  // one-time sync from a browser-only store, not a derived-state loop.
  //
  // Seed candidates/tasks are merged in by id rather than only used as a
  // fallback, so they still show up even in a browser that already has other
  // locally-saved data. A few seed fields (e.g. an interview time meant to
  // always read as "today") are re-pinned on every load even for an
  // already-stored copy, so they stay current.
  useEffect(() => {
    const storedCandidates = readLocalStorage<Candidate[]>(CANDIDATES_KEY, []);
    const storedCandidateIds = new Set(storedCandidates.map((c) => c.id));
    const seedById = new Map(seedCandidates.map((c) => [c.id, c]));
    const missingSeedCandidates = seedCandidates.filter((c) => !storedCandidateIds.has(c.id));

    const refreshedCandidates = storedCandidates.map((c) => {
      if (!PINNED_TODAY_INTERVIEW_IDS.has(c.id)) return c;
      const seed = seedById.get(c.id);
      return seed ? { ...c, interviewAt: seed.interviewAt } : c;
    });

    const storedTasks = readLocalStorage<OnboardingTask[]>(ONBOARDING_KEY, []);
    const storedTaskIds = new Set(storedTasks.map((t) => t.id));
    const missingSeedTasks = seedOnboardingTasks.filter((t) => !storedTaskIds.has(t.id));

    const storedAssignments = readLocalStorage<InterviewAssignment[]>(INTERVIEW_ASSIGNMENTS_KEY, []);
    const storedNotices = readLocalStorage<InterviewNotice[]>(INTERVIEW_NOTICES_KEY, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCandidates([...refreshedCandidates, ...missingSeedCandidates]);
    setOnboardingTasks([...storedTasks, ...missingSeedTasks]);
    setInterviewAssignments(storedAssignments);
    setInterviewNotices(storedNotices);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeLocalStorage(CANDIDATES_KEY, candidates);
  }, [candidates, hydrated]);

  useEffect(() => {
    if (hydrated) writeLocalStorage(ONBOARDING_KEY, onboardingTasks);
  }, [onboardingTasks, hydrated]);

  useEffect(() => {
    if (hydrated) writeLocalStorage(INTERVIEW_ASSIGNMENTS_KEY, interviewAssignments);
  }, [interviewAssignments, hydrated]);

  useEffect(() => {
    if (hydrated) writeLocalStorage(INTERVIEW_NOTICES_KEY, interviewNotices);
  }, [interviewNotices, hydrated]);

  function addCandidate(input: CandidateInput) {
    const candidate: Candidate = {
      ...input,
      id: `cand-${Date.now()}`,
      createdAt: new Date().toISOString(),
      stage: "서류",
    };
    setCandidates((prev) => [candidate, ...prev]);
  }

  function ensureOnboardingTasks(candidateId: string) {
    setOnboardingTasks((prev) => {
      if (prev.some((t) => t.candidateId === candidateId)) return prev;
      return [...prev, ...createOnboardingTasksForCandidate(candidateId)];
    });
  }

  function updateCandidateStage(id: string, stage: RecruitStage, interviewAt?: string) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage, interviewAt: interviewAt ?? c.interviewAt } : c))
    );
    if (stage === "합격") ensureOnboardingTasks(id);
  }

  function toggleOnboardingTask(taskId: string) {
    setOnboardingTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  }

  // 현재 "면접" 단계인 지원자 전원을 대상으로 패널 배정과 일정을 다시
  // 계산해서 덮어쓴다. 후보자의 interviewAt도 배정 결과와 맞춰 갱신한다.
  function runAutoAssign(internalNames: string[], externalNames: string[]) {
    const targetIds = candidates.filter((c) => c.stage === "면접").map((c) => c.id);
    const { assignments } = generateSchedule(targetIds, internalNames, externalNames);
    setInterviewAssignments(assignments);
    const assignmentByCandidateId = new Map(assignments.map((a) => [a.candidateId, a]));
    setCandidates((prev) =>
      prev.map((c) => {
        const a = assignmentByCandidateId.get(c.id);
        if (!a) return c;
        return { ...c, interviewAt: `${a.date}T${a.startTime}` };
      })
    );
  }

  function updateNotice(candidateId: string, patch: Partial<InterviewNotice>) {
    setInterviewNotices((prev) => {
      const idx = prev.findIndex((n) => n.candidateId === candidateId);
      if (idx === -1) return [...prev, { candidateId, ...patch }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function sendD3Notice(candidateId: string) {
    updateNotice(candidateId, { d3SentAt: new Date().toISOString() });
  }

  function sendD1Notice(candidateId: string) {
    updateNotice(candidateId, { d1SentAt: new Date().toISOString() });
  }

  function recordNoticeResponse(candidateId: string) {
    updateNotice(candidateId, { respondedAt: new Date().toISOString() });
  }

  // 결석 처리: 배정에서 빼고, 같은 패널·같은 날 뒤 순번들을 당겨 배정한다.
  function markNoShowAndReshuffle(candidateId: string) {
    setInterviewAssignments((prev) => removeAndCompactAssignment(prev, candidateId));
  }

  // 노쇼 위험 후보의 슬롯(패널·회의실·일시)을 대기명단 후보로 그대로
  // 대체한다. 원래 후보는 "면접" 단계에 남지만 일정은 비워진다.
  function reassignFromWaitlist(riskyCandidateId: string, waitlistCandidateId: string) {
    const next = replaceAssignmentCandidate(interviewAssignments, riskyCandidateId, waitlistCandidateId);
    const newAssignment = next.find((a) => a.candidateId === waitlistCandidateId);
    setInterviewAssignments(next);
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === waitlistCandidateId) {
          return {
            ...c,
            stage: "면접",
            interviewAt: newAssignment ? `${newAssignment.date}T${newAssignment.startTime}` : c.interviewAt,
          };
        }
        if (c.id === riskyCandidateId) {
          return { ...c, interviewAt: undefined };
        }
        return c;
      })
    );
  }

  function updateOnboardingTask(
    taskId: string,
    patch: Partial<Pick<OnboardingTask, "assignee" | "dueDate">>
  ) {
    setOnboardingTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }

  const value: RecruitContextValue = {
    candidates,
    jobPostings,
    onboardingTasks,
    interviewAssignments,
    interviewNotices,
    addCandidate,
    updateCandidateStage,
    toggleOnboardingTask,
    updateOnboardingTask,
    ensureOnboardingTasks,
    runAutoAssign,
    sendD3Notice,
    sendD1Notice,
    recordNoticeResponse,
    markNoShowAndReshuffle,
    reassignFromWaitlist,
  };

  return <RecruitContext.Provider value={value}>{children}</RecruitContext.Provider>;
}

export function useRecruit() {
  const ctx = useContext(RecruitContext);
  if (!ctx) throw new Error("useRecruit must be used within a RecruitProvider");
  return ctx;
}
