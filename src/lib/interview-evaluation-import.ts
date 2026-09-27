import type { Candidate } from "./recruit-types";
import type { InterviewAssignment } from "./interview-scheduling";
import { EVALUATION_CRITERIA } from "./interview-evaluation";

// Cowork 등 외부 도구가 정리해서 넘겨주는 평가표 CSV를 "면접 결과 기록"에
// 자동 반영하기 위한 가져오기 포맷. 헤더는 반드시 아래 순서/이름과 같아야
// 한다: candidateName, interviewerName, jobFit, communication, problemSolving,
// cultureFit, comment. score는 4개 항목의 합으로 자동 계산되므로 넣지 않는다.
export const IMPORT_CSV_HEADERS = [
  "candidateName",
  "interviewerName",
  ...EVALUATION_CRITERIA.map((c) => c.key),
  "comment",
] as const;

export type ImportRowStatus =
  | "ok"
  | "candidate-not-found"
  | "candidate-ambiguous"
  | "interviewer-mismatch"
  | "invalid-score";

export interface ParsedImportRow {
  rowIndex: number; // 1-based, 헤더 제외 데이터 행 기준
  candidateName: string;
  interviewerName: string;
  breakdown: Record<string, number>;
  comment: string;
  status: ImportRowStatus;
  candidateId?: string;
  message?: string;
}

/** RFC4180 스타일 CSV 파싱 — 코멘트 필드에 콤마·줄바꿈이 들어가도 따옴표로 감싸면 안전하게 처리한다. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function findCandidateByName(name: string, candidates: Candidate[]): Candidate[] {
  const target = name.trim().toLowerCase();
  return candidates.filter((c) => c.name.trim().toLowerCase() === target);
}

/**
 * 파싱된 CSV 행들을 현재 앱 데이터(지원자 목록·면접 배정)와 대조해서, 각
 * 행이 그대로 반영 가능한지(candidateId까지 확정) 판정한다. 실제 반영
 * (submitEvaluation 호출)은 호출부에서 status === "ok"인 행만 골라 한다.
 */
export function matchImportRows(
  csvRows: string[][],
  candidates: Candidate[],
  interviewAssignments: InterviewAssignment[]
): ParsedImportRow[] {
  const [header, ...dataRows] = csvRows;
  const headerOk =
    header &&
    header.length === IMPORT_CSV_HEADERS.length &&
    header.every((h, i) => h.trim() === IMPORT_CSV_HEADERS[i]);

  if (!headerOk) {
    throw new Error(
      `CSV 헤더가 예상과 다릅니다. 다음 순서여야 합니다: ${IMPORT_CSV_HEADERS.join(", ")}`
    );
  }

  return dataRows.map((cells, idx): ParsedImportRow => {
    const rowIndex = idx + 1;
    const [candidateName, interviewerName, ...rest] = cells;
    const scoreValues = rest.slice(0, EVALUATION_CRITERIA.length);
    const comment = rest[EVALUATION_CRITERIA.length] ?? "";

    const breakdown: Record<string, number> = {};
    for (let i = 0; i < EVALUATION_CRITERIA.length; i++) {
      const criterion = EVALUATION_CRITERIA[i];
      const raw = Number(scoreValues[i]);
      breakdown[criterion.key] = raw;
      if (!Number.isFinite(raw) || raw < 0 || raw > criterion.max) {
        return {
          rowIndex,
          candidateName,
          interviewerName,
          breakdown,
          comment,
          status: "invalid-score",
          message: `"${criterion.label}" 점수는 0~${criterion.max} 사이여야 합니다 (입력값: ${scoreValues[i]})`,
        };
      }
    }

    const matches = findCandidateByName(candidateName, candidates);
    if (matches.length === 0) {
      return {
        rowIndex,
        candidateName,
        interviewerName,
        breakdown,
        comment,
        status: "candidate-not-found",
        message: `"${candidateName}" 이름의 지원자를 찾을 수 없습니다.`,
      };
    }
    if (matches.length > 1) {
      return {
        rowIndex,
        candidateName,
        interviewerName,
        breakdown,
        comment,
        status: "candidate-ambiguous",
        message: `"${candidateName}" 이름의 지원자가 ${matches.length}명 있어 자동으로 특정할 수 없습니다.`,
      };
    }

    const candidate = matches[0];
    const hasAssignment = interviewAssignments.some(
      (a) =>
        a.candidateId === candidate.id &&
        (a.internalInterviewer === interviewerName || a.externalInterviewer === interviewerName)
    );
    if (!hasAssignment) {
      return {
        rowIndex,
        candidateName,
        interviewerName,
        breakdown,
        comment,
        status: "interviewer-mismatch",
        candidateId: candidate.id,
        message: `"${candidate.name}"에게 배정된 면접관 중 "${interviewerName}"이(가) 없습니다.`,
      };
    }

    return {
      rowIndex,
      candidateName,
      interviewerName,
      breakdown,
      comment,
      status: "ok",
      candidateId: candidate.id,
    };
  });
}
