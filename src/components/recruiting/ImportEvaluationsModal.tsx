"use client";

import { useState } from "react";
import {
  IMPORT_CSV_HEADERS,
  parseCsv,
  matchImportRows,
  type ParsedImportRow,
} from "@/lib/interview-evaluation-import";
import { EVALUATION_CRITERIA } from "@/lib/interview-evaluation";
import { useRecruit } from "./RecruitContext";

const statusLabel: Record<ParsedImportRow["status"], string> = {
  ok: "반영 가능",
  "candidate-not-found": "지원자 못 찾음",
  "candidate-ambiguous": "지원자 이름 중복",
  "interviewer-mismatch": "배정 안 된 면접관",
  "invalid-score": "점수 범위 오류",
};

const statusStyle: Record<ParsedImportRow["status"], string> = {
  ok: "bg-green-50 text-green-700",
  "candidate-not-found": "bg-red-50 text-red-700",
  "candidate-ambiguous": "bg-red-50 text-red-700",
  "interviewer-mismatch": "bg-amber-50 text-amber-700",
  "invalid-score": "bg-red-50 text-red-700",
};

interface Props {
  onClose: () => void;
}

export default function ImportEvaluationsModal({ onClose }: Props) {
  const { candidates, interviewAssignments, submitEvaluation } = useRecruit();
  const [rows, setRows] = useState<ParsedImportRow[] | null>(null);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");
  const [imported, setImported] = useState<number | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setImported(null);
    setParseError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const csvRows = parseCsv(String(reader.result ?? ""));
        setRows(matchImportRows(csvRows, candidates, interviewAssignments));
      } catch (err) {
        setRows(null);
        setParseError(err instanceof Error ? err.message : "CSV를 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  }

  const okRows = rows?.filter((r) => r.status === "ok") ?? [];

  function handleImport() {
    for (const row of okRows) {
      if (!row.candidateId) continue;
      submitEvaluation(row.candidateId, row.interviewerName, row.breakdown, row.comment);
    }
    setImported(okRows.length);
    setRows(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">외부 평가표 가져오기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <p className="mb-3 text-xs text-gray-500">
          아래 헤더 순서 그대로인 CSV 파일을 업로드하세요. 점수는 항목마다 0~
          {EVALUATION_CRITERIA[0].max}점, 종합 점수는 4개 항목의 합으로 자동 계산됩니다.
        </p>
        <code className="mb-3 block overflow-x-auto rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {IMPORT_CSV_HEADERS.join(",")}
        </code>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="mb-3 text-sm"
        />

        {parseError && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{parseError}</p>
        )}

        {imported !== null && (
          <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {fileName}에서 {imported}건을 반영했습니다.
          </p>
        )}

        {rows && rows.length > 0 && (
          <div className="flex-1 overflow-y-auto rounded-md border border-gray-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-2 py-1.5 font-medium">#</th>
                  <th className="px-2 py-1.5 font-medium">지원자</th>
                  <th className="px-2 py-1.5 font-medium">면접관</th>
                  <th className="px-2 py-1.5 font-medium">점수</th>
                  <th className="px-2 py-1.5 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowIndex} className="border-t border-gray-50">
                    <td className="px-2 py-1.5 text-gray-400">{r.rowIndex}</td>
                    <td className="px-2 py-1.5 text-gray-900">{r.candidateName}</td>
                    <td className="px-2 py-1.5 text-gray-700">{r.interviewerName}</td>
                    <td className="px-2 py-1.5 text-gray-700">
                      {Object.values(r.breakdown).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0)}점
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        title={r.message}
                        className={`rounded px-1.5 py-0.5 font-medium ${statusStyle[r.status]}`}
                      >
                        {statusLabel[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400">
            {rows ? `${okRows.length}건 반영 가능 / 전체 ${rows.length}건` : "파일을 선택해주세요."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              닫기
            </button>
            <button
              onClick={handleImport}
              disabled={okRows.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {okRows.length}건 가져오기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
