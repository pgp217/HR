"use client";

import { useState } from "react";
import { EVALUATION_CRITERIA, type InterviewEvaluation } from "@/lib/interview-evaluation";

interface Props {
  candidateName: string;
  interviewerName: string;
  existing?: InterviewEvaluation;
  onSubmit: (breakdown: Record<string, number>, comment: string) => void;
  onClose: () => void;
}

export default function EvaluationFormModal({
  candidateName,
  interviewerName,
  existing,
  onSubmit,
  onClose,
}: Props) {
  const [breakdown, setBreakdown] = useState<Record<string, number>>(
    existing?.breakdown ?? Object.fromEntries(EVALUATION_CRITERIA.map((c) => [c.key, 0]))
  );
  const [comment, setComment] = useState(existing?.comment ?? "");

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(breakdown, comment);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">면접 평가표</h3>
            <p className="text-xs text-gray-400">
              {candidateName} · 평가자: {interviewerName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {EVALUATION_CRITERIA.map((c) => (
            <label key={c.key} className="flex flex-col gap-1 text-sm text-gray-700">
              <span className="flex items-center justify-between">
                <span>{c.label}</span>
                <span className="text-xs text-gray-400">
                  {breakdown[c.key] ?? 0} / {c.max}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={c.max}
                value={breakdown[c.key] ?? 0}
                onChange={(e) =>
                  setBreakdown((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm text-gray-700">
          코멘트
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="평가 코멘트를 입력하세요"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-900">종합 점수: {total}점</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
