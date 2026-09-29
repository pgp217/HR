"use client";

import { useMemo, useState } from "react";
import { staffList } from "@/lib/mock-data";
import { useAssessment } from "./AssessmentContext";
import { scoreResponse } from "@/lib/ai-assessment-scoring";
import ResultDetail from "./ResultDetail";

type RowStatus = "미응시" | "채점 대기" | "확인 대기" | "확정 완료";

const statusStyle: Record<RowStatus, string> = {
  미응시: "bg-gray-100 text-gray-500",
  "채점 대기": "bg-amber-50 text-amber-700",
  "확인 대기": "bg-blue-50 text-blue-700",
  "확정 완료": "bg-green-50 text-green-700",
};

const statusPriority: Record<RowStatus, number> = {
  "채점 대기": 0,
  "확인 대기": 1,
  "확정 완료": 2,
  미응시: 3,
};

export default function AssessmentDashboard() {
  const { responses, scenarioOpinions, axisConfirmations } = useAssessment();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const staffById = useMemo(() => new Map(staffList.map((s) => [s.id, s])), []);
  const responseByStaff = useMemo(() => new Map(responses.map((r) => [r.staffId, r])), [responses]);

  const rows = useMemo(() => {
    return staffList
      .map((staff) => {
        const response = responseByStaff.get(staff.id);
        if (!response) return { staff, response: null, result: null, status: "미응시" as RowStatus };

        const result = scoreResponse(response, scenarioOpinions, axisConfirmations);
        const hasPending = result.axes.some((a) => a.pending);
        const hasUnconfirmed = result.axes.some((a) => a.confirmedScore == null);
        const status: RowStatus = hasPending ? "채점 대기" : hasUnconfirmed ? "확인 대기" : "확정 완료";
        return { staff, response, result, status };
      })
      .sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
  }, [responseByStaff, scenarioOpinions, axisConfirmations]);

  const targetCount = staffList.length;
  const completedCount = rows.filter((r) => r.response).length;
  const pendingGradeCount = rows.filter((r) => r.status === "채점 대기").length;
  const confirmedCount = rows.filter((r) => r.status === "확정 완료").length;

  const selectedRow = selectedStaffId ? rows.find((r) => r.staff.id === selectedStaffId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">응시 대상</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{targetCount}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">응시 완료</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{completedCount}명</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">채점 대기</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingGradeCount}명</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">확정 완료</p>
          <p className="mt-2 text-2xl font-bold text-green-700">{confirmedCount}명</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">응시자 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">이름</th>
                <th className="px-4 py-2 font-medium">팀</th>
                <th className="px-4 py-2 font-medium">직급</th>
                <th className="px-4 py-2 font-medium">상태</th>
                <th className="px-4 py-2 font-medium">총점</th>
                <th className="px-4 py-2 font-medium">수준</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ staff, result, status }) => (
                <tr
                  key={staff.id}
                  onClick={() => result && setSelectedStaffId(staff.id)}
                  className={`border-b border-gray-50 last:border-0 ${result ? "cursor-pointer hover:bg-gray-50" : ""}`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">{staff.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{staff.team}</td>
                  <td className="px-4 py-2.5 text-gray-600">{staff.role}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyle[status]}`}>{status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{result ? `${result.totalScore}점` : "-"}</td>
                  <td className="px-4 py-2.5 text-gray-700">{result ? result.level : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRow?.result && (
        <ResultDetail
          staff={selectedRow.staff}
          manager={selectedRow.staff.managerId ? (staffById.get(selectedRow.staff.managerId) ?? null) : null}
          result={selectedRow.result}
          onClose={() => setSelectedStaffId(null)}
        />
      )}
    </div>
  );
}
