"use client";

import { useMemo, useState } from "react";
import { useLeave, CURRENT_YEAR } from "@/components/leave/LeaveContext";
import type { LeaveGrant } from "@/lib/types";

const yearOptions = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

interface Draft {
  granted: number;
  carryover: number;
  adjustment: number;
}

export default function LeaveGrantsPanel() {
  const { staffList, grants, requests, updateGrant } = useLeave();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ granted: 0, carryover: 0, adjustment: 0 });

  const grantByStaff = useMemo(() => {
    const map = new Map<string, LeaveGrant>();
    for (const g of grants) {
      if (g.year === year) map.set(g.staffId, g);
    }
    return map;
  }, [grants, year]);

  const usedByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== "승인") continue;
      if (new Date(r.startDate).getFullYear() !== year) continue;
      map.set(r.staffId, (map.get(r.staffId) ?? 0) + r.days);
    }
    return map;
  }, [requests, year]);

  const pendingByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== "승인대기") continue;
      if (new Date(r.startDate).getFullYear() !== year) continue;
      map.set(r.staffId, (map.get(r.staffId) ?? 0) + r.days);
    }
    return map;
  }, [requests, year]);

  const settledCount = staffList.filter((s) => grantByStaff.has(s.id)).length;
  const unsetCount = staffList.length - settledCount;

  function startEdit(staffId: string) {
    const g = grantByStaff.get(staffId);
    setDraft({
      granted: g?.granted ?? 0,
      carryover: g?.carryover ?? 0,
      adjustment: g?.adjustment ?? 0,
    });
    setEditingId(staffId);
  }

  function saveEdit(staffId: string) {
    updateGrant(staffId, year, draft);
    setEditingId(null);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">📅 연차 부여 ({year}년)</h3>
          <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            완료 {settledCount}명
          </span>
          {unsetCount > 0 && (
            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              미설정 {unsetCount}명
            </span>
          )}
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
            <th className="px-4 py-2 font-medium">직원</th>
            <th className="px-4 py-2 font-medium">부여</th>
            <th className="px-4 py-2 font-medium">이월</th>
            <th className="px-4 py-2 font-medium">조정</th>
            <th className="px-4 py-2 font-medium">사용</th>
            <th className="px-4 py-2 font-medium">대기</th>
            <th className="px-4 py-2 font-medium">잔여</th>
            <th className="px-4 py-2 font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staff) => {
            const g = grantByStaff.get(staff.id);
            const isSet = Boolean(g);
            const granted = g?.granted ?? 0;
            const carryover = g?.carryover ?? 0;
            const adjustment = g?.adjustment ?? 0;
            const used = usedByStaff.get(staff.id) ?? 0;
            const pending = pendingByStaff.get(staff.id) ?? 0;
            const remaining = granted + carryover + adjustment - used;
            const isEditing = editingId === staff.id;

            return (
              <tr key={staff.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {staff.name}
                  {!isSet && (
                    <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                      미설정
                    </span>
                  )}
                </td>
                {isEditing ? (
                  <>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={draft.granted}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, granted: Number(e.target.value) }))
                        }
                        className="w-16 rounded border border-gray-300 px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={draft.carryover}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, carryover: Number(e.target.value) }))
                        }
                        className="w-16 rounded border border-gray-300 px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={draft.adjustment}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, adjustment: Number(e.target.value) }))
                        }
                        className="w-16 rounded border border-gray-300 px-1.5 py-1 text-xs"
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 text-gray-700">{isSet ? `${granted}일` : "-"}</td>
                    <td className="px-4 py-2.5 text-gray-700">{isSet ? `${carryover}일` : "-"}</td>
                    <td className="px-4 py-2.5 text-gray-700">{isSet ? `${adjustment}일` : "-"}</td>
                  </>
                )}
                <td className="px-4 py-2.5 text-gray-700">{used}일</td>
                <td className="px-4 py-2.5 text-gray-700">{pending > 0 ? `${pending}일` : "-"}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {isSet ? `${remaining}일` : "-"}
                </td>
                <td className="px-4 py-2.5">
                  {isEditing ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveEdit(staff.id)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(staff.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      수정
                    </button>
                  )}
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
