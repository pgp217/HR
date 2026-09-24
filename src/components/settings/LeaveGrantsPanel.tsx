"use client";

import { useMemo, useState } from "react";
import { useLeave, CURRENT_YEAR } from "@/components/leave/LeaveContext";
import type { LeaveGrant } from "@/lib/types";
import { toISODate, today } from "@/lib/date";
import { MIN_STAFF_FOR_LEAVE_LAW, accrualAsOfDateForYear, computeAnnualLeaveDays } from "@/lib/leave-accrual";

const yearOptions = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const todayISO = toISODate(today());

interface Draft {
  carryover: number;
  adjustment: number;
}

export default function LeaveGrantsPanel() {
  const { staffList, grants, requests, updateGrant } = useLeave();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ carryover: 0, adjustment: 0 });

  const grantByStaff = useMemo(() => {
    const map = new Map<string, LeaveGrant>();
    for (const g of grants) {
      if (g.year === year) map.set(g.staffId, g);
    }
    return map;
  }, [grants, year]);

  const accrualByStaff = useMemo(() => {
    const asOf = accrualAsOfDateForYear(year, todayISO);
    const map = new Map<string, ReturnType<typeof computeAnnualLeaveDays>>();
    for (const staff of staffList) {
      map.set(staff.id, computeAnnualLeaveDays(staff, year, asOf, staffList.length));
    }
    return map;
  }, [staffList, year]);

  const usedByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== "승인") continue;
      if (Number(r.startDate.slice(0, 4)) !== year) continue;
      map.set(r.staffId, (map.get(r.staffId) ?? 0) + r.days);
    }
    return map;
  }, [requests, year]);

  const pendingByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== "승인대기") continue;
      if (Number(r.startDate.slice(0, 4)) !== year) continue;
      map.set(r.staffId, (map.get(r.staffId) ?? 0) + r.days);
    }
    return map;
  }, [requests, year]);

  const lawApplies = staffList.length >= MIN_STAFF_FOR_LEAVE_LAW;

  function startEdit(staffId: string) {
    const g = grantByStaff.get(staffId);
    setDraft({ carryover: g?.carryover ?? 0, adjustment: g?.adjustment ?? 0 });
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
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            근로기준법 제60조 자동 계산
          </span>
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

      {!lawApplies && (
        <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          상시근로자 수가 {MIN_STAFF_FOR_LEAVE_LAW}명 미만이라 연차 규정이 적용되지 않아 부여일수가 0일로 계산됩니다.
        </p>
      )}

      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
            <th className="px-4 py-2 font-medium">직원</th>
            <th className="px-4 py-2 font-medium">부여(자동)</th>
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
            const accrual = accrualByStaff.get(staff.id)!;
            const carryover = g?.carryover ?? 0;
            const adjustment = g?.adjustment ?? 0;
            const used = usedByStaff.get(staff.id) ?? 0;
            const pending = pendingByStaff.get(staff.id) ?? 0;
            const remaining = accrual.days + carryover + adjustment - used;
            const isEditing = editingId === staff.id;

            return (
              <tr key={staff.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-900">{staff.name}</td>
                <td className="px-4 py-2.5 text-gray-700">
                  <span
                    title={
                      accrual.regularDays === 0
                        ? `입사 후 개근 특례 ${accrual.specialDays}일 (최대 11일)`
                        : accrual.specialDays > 0
                          ? `1년 미만 특례 잔여 ${accrual.specialDays}일 + 근속 ${accrual.tenureYears}년차 정기 ${accrual.regularDays}일(기본 15일 + 가산 ${accrual.regularDays - 15}일)`
                          : `근속 ${accrual.tenureYears}년차 (기본 15일 + 가산 ${accrual.regularDays - 15}일)`
                    }
                    className="cursor-help border-b border-dashed border-gray-300"
                  >
                    {accrual.days}일
                  </span>
                </td>
                {isEditing ? (
                  <>
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
                    <td className="px-4 py-2.5 text-gray-700">{carryover}일</td>
                    <td className="px-4 py-2.5 text-gray-700">{adjustment}일</td>
                  </>
                )}
                <td className="px-4 py-2.5 text-gray-700">{used}일</td>
                <td className="px-4 py-2.5 text-gray-700">{pending > 0 ? `${pending}일` : "-"}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900">{remaining}일</td>
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
                      이월·조정
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
