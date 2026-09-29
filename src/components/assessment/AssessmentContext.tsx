"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { readLocalStorage, writeLocalStorage } from "@/lib/storage";
import type { AssessmentResponse, AxisConfirmation, ScenarioAiOpinion } from "@/lib/ai-assessment-types";

interface AssessmentContextValue {
  responses: AssessmentResponse[];
  scenarioOpinions: ScenarioAiOpinion[];
  axisConfirmations: AxisConfirmation[];
  submitResponse: (input: Omit<AssessmentResponse, "id" | "submittedAt">) => AssessmentResponse;
  recordScenarioOpinion: (opinion: Omit<ScenarioAiOpinion, "gradedAt">) => void;
  confirmAxis: (input: Omit<AxisConfirmation, "confirmedAt">) => void;
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

const RESPONSES_KEY = "hr-ai-assessment-responses";
const OPINIONS_KEY = "hr-ai-assessment-opinions";
const CONFIRMATIONS_KEY = "hr-ai-assessment-confirmations";

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [scenarioOpinions, setScenarioOpinions] = useState<ScenarioAiOpinion[]>([]);
  const [axisConfirmations, setAxisConfirmations] = useState<AxisConfirmation[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResponses(readLocalStorage(RESPONSES_KEY, []));
    setScenarioOpinions(readLocalStorage(OPINIONS_KEY, []));
    setAxisConfirmations(readLocalStorage(CONFIRMATIONS_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeLocalStorage(RESPONSES_KEY, responses);
  }, [responses, hydrated]);
  useEffect(() => {
    if (hydrated) writeLocalStorage(OPINIONS_KEY, scenarioOpinions);
  }, [scenarioOpinions, hydrated]);
  useEffect(() => {
    if (hydrated) writeLocalStorage(CONFIRMATIONS_KEY, axisConfirmations);
  }, [axisConfirmations, hydrated]);

  function submitResponse(input: Omit<AssessmentResponse, "id" | "submittedAt">): AssessmentResponse {
    const response: AssessmentResponse = {
      ...input,
      id: `resp-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    setResponses((prev) => [...prev, response]);
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

  return (
    <AssessmentContext.Provider
      value={{ responses, scenarioOpinions, axisConfirmations, submitResponse, recordScenarioOpinion, confirmAxis }}
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
