"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Candidate, CandidateInput, JobPosting, RecruitStage } from "@/lib/recruit-types";
import { jobPostings } from "@/lib/recruit-postings";
import { seedCandidates } from "@/lib/recruit-seed-candidates";
import { readLocalStorage, writeLocalStorage } from "@/lib/storage";

const STORAGE_KEY = "hr-recruit-candidates";

interface RecruitContextValue {
  candidates: Candidate[];
  jobPostings: JobPosting[];
  addCandidate: (input: CandidateInput) => void;
  updateCandidateStage: (id: string, stage: RecruitStage, interviewAt?: string) => void;
}

const RecruitContext = createContext<RecruitContextValue | null>(null);

export function RecruitProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage only after mount so the server-rendered HTML and
  // the first client render match (avoids hydration mismatches). This is a
  // one-time sync from a browser-only store, not a derived-state loop.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCandidates(readLocalStorage<Candidate[]>(STORAGE_KEY, seedCandidates));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeLocalStorage(STORAGE_KEY, candidates);
  }, [candidates, hydrated]);

  function addCandidate(input: CandidateInput) {
    const candidate: Candidate = {
      ...input,
      id: `cand-${Date.now()}`,
      createdAt: new Date().toISOString(),
      stage: "서류",
    };
    setCandidates((prev) => [candidate, ...prev]);
  }

  function updateCandidateStage(id: string, stage: RecruitStage, interviewAt?: string) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage, interviewAt: interviewAt ?? c.interviewAt } : c))
    );
  }

  const value: RecruitContextValue = {
    candidates,
    jobPostings,
    addCandidate,
    updateCandidateStage,
  };

  return <RecruitContext.Provider value={value}>{children}</RecruitContext.Provider>;
}

export function useRecruit() {
  const ctx = useContext(RecruitContext);
  if (!ctx) throw new Error("useRecruit must be used within a RecruitProvider");
  return ctx;
}
