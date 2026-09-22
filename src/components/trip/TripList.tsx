"use client";

import type { Staff, TripRecord } from "@/lib/types";
import { formatKoreanDate } from "@/lib/date";

interface Props {
  records: TripRecord[];
  staffById: Map<string, Staff>;
  onDelete: (id: string) => void;
}

export default function TripList({ records, staffById, onDelete }: Props) {
  const sorted = [...records].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">출장·외출 등록 목록</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-medium">직원</th>
              <th className="px-4 py-2 font-medium">종류</th>
              <th className="px-4 py-2 font-medium">기간/시간</th>
              <th className="px-4 py-2 font-medium">목적지·사유</th>
              <th className="px-4 py-2 font-medium">연락 가능</th>
              <th className="px-4 py-2 font-medium">신청일</th>
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  등록된 출장·외출이 없습니다.
                </td>
              </tr>
            )}
            {sorted.map((r) => {
              const sameDay = r.startDate === r.endDate;
              return (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {staffById.get(r.staffId)?.name ?? "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        r.type === "출장" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {r.startTime && r.endTime
                      ? `${formatKoreanDate(r.startDate)} ${r.startTime}~${r.endTime}`
                      : sameDay
                        ? formatKoreanDate(r.startDate)
                        : `${formatKoreanDate(r.startDate)} ~ ${formatKoreanDate(r.endDate)}`}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    <span className="block max-w-[220px] truncate" title={r.purpose}>
                      {r.purpose}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.reachable ? (
                      <span className="text-gray-700">연락 가능</span>
                    ) : (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        연락 어려움
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{formatKoreanDate(r.requestedAt)}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      보고완료
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => onDelete(r.id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
