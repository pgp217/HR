"use client";

import { useEffect, useMemo, useState } from "react";
import { scoreResponse } from "@/lib/ai-assessment-scoring";
import { checkReliability } from "@/lib/ai-assessment-reliability";
import { candidateToAssessmentResponse, type Candidate } from "@/lib/candidate-types";
import ResultDetail from "./ResultDetail";

type RowStatus = "초대됨" | "채점 대기" | "확인 대기" | "확정 완료";

const statusStyle: Record<RowStatus, string> = {
  초대됨: "bg-gray-100 text-gray-500",
  "채점 대기": "bg-amber-50 text-amber-700",
  "확인 대기": "bg-blue-50 text-blue-700",
  "확정 완료": "bg-green-50 text-green-700",
};

const statusPriority: Record<RowStatus, number> = {
  "채점 대기": 0,
  "확인 대기": 1,
  "확정 완료": 2,
  초대됨: 3,
};

// 회사 계정이 없는 외부 지원자(신입 채용 등)에게 이메일로 응시 링크를 보내고,
// 그 결과를 이 화면에서 확인·확정하는 관리 패널. 실제 메일 발송은 하지
// 않고(별도 이메일 서비스 연동 없이) 링크를 생성해 복사하거나 메일 앱으로
// 넘기는 방식이다.
export default function CandidateManager() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadCandidates() {
    setLoading(true);
    try {
      const res = await fetch("/api/candidates");
      const data = await res.json();
      if (!res.ok) {
        setDbError(data.error ?? "지원자 목록을 불러오지 못했습니다.");
        setCandidates([]);
        return;
      }
      setDbError(null);
      setCandidates(data.candidates as Candidate[]);
    } catch {
      setDbError("지원자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCandidates();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "초대 링크 생성에 실패했습니다.");
        return;
      }
      const link = `${window.location.origin}/apply/${data.token}`;
      setLastInviteLink(link);
      setCopyStatus("idle");
      setName("");
      setEmail("");
      await loadCandidates();
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      // 클립보드 권한이 없는 환경에서는 조용히 무시 — 링크는 화면에 그대로 보인다.
    }
  }

  const rows = useMemo(() => {
    return candidates
      .map((candidate) => {
        if (!candidate.submittedAt) {
          return { candidate, result: null, status: "초대됨" as RowStatus, reliabilityFlags: [] };
        }
        const response = candidateToAssessmentResponse(candidate);
        const result = scoreResponse(response, candidate.scenarioOpinions, candidate.axisConfirmations);
        const hasPending = result.axes.some((a) => a.pending);
        const hasUnconfirmed = result.axes.some((a) => a.confirmedScore == null);
        const status: RowStatus = hasPending ? "채점 대기" : hasUnconfirmed ? "확인 대기" : "확정 완료";
        const reliabilityFlags = checkReliability(response);
        return { candidate, result, status, reliabilityFlags };
      })
      .sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
  }, [candidates]);

  const scoredRows = rows.filter((r) => r.result);
  const rankById = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of scoredRows) {
      const higherCount = scoredRows.filter((other) => other.result!.totalScore > row.result!.totalScore).length;
      map.set(row.candidate.id, higherCount + 1);
    }
    return map;
  }, [scoredRows]);

  const selectedRow = selectedId ? rows.find((r) => r.candidate.id === selectedId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">확정자(담당자) 이름</label>
          <input
            value={confirmedBy}
            onChange={(e) => setConfirmedBy(e.target.value)}
            placeholder="예: 김도현"
            className="w-40 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <p className="text-xs text-gray-400">지원자의 축 점수를 확정할 때 담당자 이름으로 기록됩니다.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">외부 지원자 초대</h3>
        <p className="mb-3 text-xs text-gray-500">
          회사 계정이 없는 지원자에게 응시 링크를 이메일로 보내주세요. 링크를 여는 사람은 로그인 없이 바로 응시할 수 있습니다.
        </p>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="지원자 이름"
              className="w-40 rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
              className="w-56 rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={creating || !name.trim() || !email.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {creating ? "생성 중..." : "응시 링크 생성"}
          </button>
        </form>

        {lastInviteLink && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
            <input readOnly value={lastInviteLink} className="min-w-0 flex-1 bg-transparent text-xs text-blue-800" />
            <button
              onClick={() => copyLink(lastInviteLink)}
              className="rounded border border-blue-300 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              {copyStatus === "copied" ? "복사됨" : "링크 복사"}
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent("AI 역량진단 응시 안내")}&body=${encodeURIComponent(`안녕하세요.\n\n아래 링크에서 AI 역량진단에 응시해주세요.\n${lastInviteLink}`)}`}
              className="rounded border border-blue-300 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              메일 앱으로 보내기
            </a>
          </div>
        )}
      </div>

      {dbError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">⚠ {dbError}</p>
          <p className="mt-1 text-xs text-red-600">
            Vercel 대시보드의 Storage 탭에서 Postgres(Neon)를 연결하면 DATABASE_URL 환경변수가 자동으로 설정됩니다.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">지원자 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">이름</th>
                <th className="px-4 py-2 font-medium">이메일</th>
                <th className="px-4 py-2 font-medium">상태</th>
                <th className="px-4 py-2 font-medium">총점</th>
                <th className="px-4 py-2 font-medium">순위</th>
                <th className="px-4 py-2 font-medium">수준</th>
                <th className="px-4 py-2 font-medium">신뢰도</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && !dbError && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    아직 초대한 지원자가 없습니다.
                  </td>
                </tr>
              )}
              {rows.map(({ candidate, result, status, reliabilityFlags }) => (
                <tr
                  key={candidate.id}
                  onClick={() => result && setSelectedId(candidate.id)}
                  className={`border-b border-gray-50 last:border-0 ${result ? "cursor-pointer hover:bg-gray-50" : ""}`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">{candidate.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{candidate.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyle[status]}`}>{status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{result ? `${result.totalScore}점` : "-"}</td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {result ? `${rankById.get(candidate.id)}/${scoredRows.length}위` : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{result ? result.level : "-"}</td>
                  <td className="px-4 py-2.5">
                    {reliabilityFlags.length > 0 ? (
                      <span
                        title={reliabilityFlags.map((f) => f.label).join("\n")}
                        className="cursor-help rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700"
                      >
                        ⚠ 확인 필요
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRow?.result && (
        <ResultDetail
          title={`${selectedRow.candidate.name} (외부 지원자)`}
          subtitle={selectedRow.candidate.email}
          result={selectedRow.result}
          rank={rankById.get(selectedRow.candidate.id) ?? null}
          totalRanked={scoredRows.length}
          reliabilityFlags={selectedRow.reliabilityFlags}
          confirmedBy={confirmedBy}
          onConfirmAxis={async (input) => {
            if (!confirmedBy.trim()) {
              alert("확정자 이름을 먼저 입력해주세요.");
              return;
            }
            const res = await fetch(`/api/candidates/${selectedRow.candidate.id}/confirm-axis`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(input),
            });
            if (res.ok) await loadCandidates();
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
