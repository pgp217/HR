"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Candidate, CandidateInput, JobPosting, RecruitStage } from "@/lib/recruit-types";
import { jobPostings } from "@/lib/recruit-postings";
import { PINNED_TODAY_INTERVIEW_IDS, seedCandidates } from "@/lib/recruit-seed-candidates";
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
  //
  // Seed candidates are merged in by id rather than only used as a fallback,
  // so they still show up even in a browser that already has other
  // locally-registered candidates saved. A few seed fields (e.g. an
  // interview time meant to always read as "today") are re-pinned on every
  // load even for an already-stored copy, so they stay current.
  useEffect(() => {
    const stored = readLocalStorage<Candidate[]>(STORAGE_KEY, []);
    const storedIds = new Set(stored.map((c) => c.id));
    const seedById = new Map(seedCandidates.map((c) => [c.id, c]));
    const missingSeeds = seedCandidates.filter((c) => !storedIds.has(c.id));

    const refreshedStored = stored.map((c) => {
      if (!PINNED_TODAY_INTERVIEW_IDS.has(c.id)) return c;
      const seed = seedById.get(c.id);
      return seed ? { ...c, interviewAt: seed.interviewAt } : c;
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCandidates([...refreshedStored, ...missingSeeds]);
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
