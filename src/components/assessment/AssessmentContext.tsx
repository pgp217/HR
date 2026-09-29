"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { readLocalStorage, writeLocalStorage } from "@/lib/storage";
import { toISODate, today } from "@/lib/date";
import type { AssessmentResponse, AssessmentRound, AxisConfirmation, ScenarioAiOpinion } from "@/lib/ai-assessment-types";

interface AssessmentContextValue {
  rounds: AssessmentRound[];
  activeRound: AssessmentRound | null;
  responses: AssessmentResponse[];
  scenarioOpinions: ScenarioAiOpinion[];
  axisConfirmations: AxisConfirmation[];
  submitResponse: (input: Omit<AssessmentResponse, "id" | "submittedAt" | "roundId">) => AssessmentResponse;
  recordScenarioOpinion: (opinion: Omit<ScenarioAiOpinion, "gradedAt">) => void;
  confirmAxis: (input: Omit<AxisConfirmation, "confirmedAt">) => void;
  startNewRound: (name: string) => AssessmentRound;
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

const ROUNDS_KEY = "hr-ai-assessment-rounds";
const RESPONSES_KEY = "hr-ai-assessment-responses";
const OPINIONS_KEY = "hr-ai-assessment-opinions";
const CONFIRMATIONS_KEY = "hr-ai-assessment-confirmations";

function firstRound(): AssessmentRound {
  return { id: "round-1", name: "1차 진단", startDate: toISODate(today()) };
}

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [rounds, setRounds] = useState<AssessmentRound[]>([]);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [scenarioOpinions, setScenarioOpinions] = useState<ScenarioAiOpinion[]>([]);
  const [axisConfirmations, setAxisConfirmations] = useState<AxisConfirmation[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedRounds = readLocalStorage<AssessmentRound[]>(ROUNDS_KEY, []);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRounds(storedRounds.length > 0 ? storedRounds : [firstRound()]);
    setResponses(readLocalStorage(RESPONSES_KEY, []));
    setScenarioOpinions(readLocalStorage(OPINIONS_KEY, []));
    setAxisConfirmations(readLocalStorage(CONFIRMATIONS_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeLocalStorage(ROUNDS_KEY, rounds);
  }, [rounds, hydrated]);
  useEffect(() => {
    if (hydrated) writeLocalStorage(RESPONSES_KEY, responses);
  }, [responses, hydrated]);
  useEffect(() => {
    if (hydrated) writeLocalStorage(OPINIONS_KEY, scenarioOpinions);
  }, [scenarioOpinions, hydrated]);
  useEffect(() => {
    if (hydrated) writeLocalStorage(CONFIRMATIONS_KEY, axisConfirmations);
  }, [axisConfirmations, hydrated]);

  const activeRound = rounds.find((r) => !r.endDate) ?? null;

  function submitResponse(input: Omit<AssessmentResponse, "id" | "submittedAt" | "roundId">): AssessmentResponse {
    const roundId = activeRound?.id ?? firstRound().id;
    const response: AssessmentResponse = {
      ...input,
      roundId,
      id: `resp-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    // 같은 회차에 같은 사람이 다시 응시하면 이전 응답을 덮어쓴다(중복 응답 방지).
    // 다른 회차의 과거 응답은 회차별 추이 비교를 위해 그대로 남긴다.
    setResponses((prev) => [...prev.filter((r) => !(r.staffId === response.staffId && r.roundId === roundId)), response]);
    return response;
  }

  function recordScenarioOpinion(opinion: Omit<ScenarioAiOpinion, "gradedAt">) {
    const record: ScenarioAiOpinion = { ...opinion, gradedAt: new Date().toISOString() };
    setScenarioOpinions((prev) => [
      ...prev.filter((o) => !(o.responseId === record.responseId && o.itemId === record.itemId)),
      record,
    ]);
  }

  function confirmAxis(input: Omit<AxisConfirmation, "confirmedAt">) {
    const record: AxisConfirmation = { ...input, confirmedAt: new Date().toISOString() };
    setAxisConfirmations((prev) => [
      ...prev.filter((c) => !(c.responseId === record.responseId && c.axis === record.axis)),
      record,
    ]);
  }

  // 진행 중이던 회차는 오늘 날짜로 마감하고, 새 회차를 시작한다.
  function startNewRound(name: string): AssessmentRound {
    const todayISO = toISODate(today());
    const newRound: AssessmentRound = { id: `round-${Date.now()}`, name, startDate: todayISO };
    setRounds((prev) => [...prev.map((r) => (r.endDate ? r : { ...r, endDate: todayISO })), newRound]);
    return newRound;
  }

  return (
    <AssessmentContext.Provider
      value={{
        rounds,
        activeRound,
        responses,
        scenarioOpinions,
        axisConfirmations,
        submitResponse,
        recordScenarioOpinion,
        confirmAxis,
        startNewRound,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment(): AssessmentContextValue {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used within AssessmentProvider");
  return ctx;
}
