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

const CANDIDATES_KEY = "hr-recruit-candidates";
const ONBOARDING_KEY = "hr-recruit-onboarding-tasks";

interface RecruitContextValue {
  candidates: Candidate[];
  jobPostings: JobPosting[];
  onboardingTasks: OnboardingTask[];
  addCandidate: (input: CandidateInput) => void;
  updateCandidateStage: (id: string, stage: RecruitStage, interviewAt?: string) => void;
  toggleOnboardingTask: (taskId: string) => void;
  updateOnboardingTask: (taskId: string, patch: Partial<Pick<OnboardingTask, "assignee" | "dueDate">>) => void;
  ensureOnboardingTasks: (candidateId: string) => void;
}

const RecruitContext = createContext<RecruitContextValue | null>(null);

export function RecruitProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCandidates([...refreshedCandidates, ...missingSeedCandidates]);
    setOnboardingTasks([...storedTasks, ...missingSeedTasks]);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeLocalStorage(CANDIDATES_KEY, candidates);
  }, [candidates, hydrated]);

  useEffect(() => {
    if (hydrated) writeLocalStorage(ONBOARDING_KEY, onboardingTasks);
  }, [onboardingTasks, hydrated]);

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
    addCandidate,
    updateCandidateStage,
    toggleOnboardingTask,
    updateOnboardingTask,
    ensureOnboardingTasks,
  };

  return <RecruitContext.Provider value={value}>{children}</RecruitContext.Provider>;
}

export function useRecruit() {
  const ctx = useContext(RecruitContext);
  if (!ctx) throw new Error("useRecruit must be used within a RecruitProvider");
  return ctx;
}
