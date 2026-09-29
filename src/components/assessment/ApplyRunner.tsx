"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SCENARIO_ITEMS } from "@/lib/ai-assessment-items";
import { axisName, type FlowAnswers } from "@/lib/ai-assessment-flow";
import AssessmentFlowRunner from "./AssessmentFlowRunner";

type Phase = "loading" | "invalid" | "intro" | "answer" | "grading" | "done" | "error";

interface Props {
  token: string;
}

// 회사 계정 없는 외부 지원자가 이메일로 받은 링크(/apply/[token])에서
// 로그인 없이 응시하는 화면. 내부 직원 응시(TestRunner)와 문항 UI는
// AssessmentFlowRunner를 공유하지만, 응답을 localStorage가 아니라
// candidates API(DB)에 저장한다는 점이 다르다.
export default function ApplyRunner({ token }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [name, setName] = useState("");
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [gradingLabel, setGradingLabel] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/candidates/token/${token}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setErrorMessage(data.error ?? "유효하지 않은 링크입니다.");
          setPhase("invalid");
          return;
        }
        setName(data.name);
        setAlreadySubmitted(data.submitted);
        setPhase("intro");
      } catch {
        if (!cancelled) {
          setErrorMessage("링크 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(answers: FlowAnswers) {
    setPhase("grading");
    try {
      const submitRes = await fetch(`/api/candidates/token/${token}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}));
        setErrorMessage(data.error ?? "제출에 실패했습니다.");
        setPhase("error");
        return;
      }

      for (const item of SCENARIO_ITEMS) {
        const answer = answers.scenarioAnswers[item.id];
        if (answer == null) continue;
        setGradingLabel(`${axisName(item.axis)} 시나리오 채점 중...`);
        try {
          const gradeRes = await fetch("/api/ai-assessment/grade", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ prompt: item.prompt, rubric: item.rubric, answer }),
          });
          const gradeData = await gradeRes.json();
          if (gradeRes.ok) {
            await fetch(`/api/candidates/token/${token}/opinions`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ itemId: item.id, score: gradeData.score, comment: gradeData.comment }),
            });
          }
        } catch {
          // 채점 API 호출이 실패해도 제출 자체는 이미 저장됐으므로, 담당자가
          // 나중에 관리 화면에서 수동으로 축 점수를 확정할 수 있다.
        }
      }
      setPhase("done");
    } catch {
      setErrorMessage("제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setPhase("error");
    }
  }

  if (phase === "loading") {
    return (
      <CenteredCard>
        <p className="text-sm text-gray-500">확인하는 중...</p>
      </CenteredCard>
    );
  }

  if (phase === "invalid" || phase === "error") {
    return (
      <CenteredCard tone="red">
        <p className="text-sm font-medium text-red-700">{errorMessage}</p>
      </CenteredCard>
    );
  }

  if (phase === "intro") {
    return (
      <CenteredCard>
        <h2 className="mb-1 text-base font-semibold text-gray-900">{name}님, 안녕하세요.</h2>
        <p className="mb-4 text-sm text-gray-500">AI 역량진단에 응시해주세요. 총 30문항이며 20~30분 정도 소요됩니다.</p>
        {alreadySubmitted && (
          <p className="mb-4 text-xs text-amber-600">이미 제출한 기록이 있습니다. 다시 응시하면 이전 응답을 덮어씁니다.</p>
        )}
        <button
          onClick={() => setPhase("answer")}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          응시 시작
        </button>
      </CenteredCard>
    );
  }

  if (phase === "grading") {
    return (
      <CenteredCard>
        <p className="text-sm font-medium text-gray-900">서술형 답안을 AI가 1차 채점하고 있습니다...</p>
        <p className="mt-2 text-xs text-gray-400">{gradingLabel}</p>
      </CenteredCard>
    );
  }

  if (phase === "done") {
    return (
      <CenteredCard tone="green">
        <p className="text-base font-semibold text-green-800">제출 완료</p>
        <p className="mt-2 text-sm text-green-700">응시해주셔서 감사합니다. 결과는 담당자 검토 후 안내드립니다.</p>
      </CenteredCard>
    );
  }

  // phase === "answer"
  return <AssessmentFlowRunner onSubmit={handleSubmit} />;
}

function CenteredCard({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "red" | "green" }) {
  const toneClass =
    tone === "red" ? "border-red-200 bg-red-50" : tone === "green" ? "border-green-200 bg-green-50" : "border-gray-200 bg-white";
  return <div className={`mx-auto max-w-md rounded-lg border p-6 text-center ${toneClass}`}>{children}</div>;
}
