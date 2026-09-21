"use client";

import { useMemo, useState } from "react";
import { staffList } from "@/lib/mock-data";
import type { DutyRotationEntry } from "@/lib/types";
import { toISODate, today } from "@/lib/date";
import { useDuty } from "@/components/duty/DutyContext";

export default function DutyRotationPanel() {
  const { rotation, assignments, updateRotation } = useDuty();
  const [draft, setDraft] = useState<DutyRotationEntry[]>(() =>
    [...rotation].sort((a, b) => a.order - b.order)
  );

  const staffById = useMemo(() => new Map(staffList.map((s) => [s.id, s])), []);

  const now = today();
  const monthStartISO = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEndISO = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const todayISO = toISODate(now);

  const thisMonthCountByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const [dateISO, staffId] of Object.entries(assignments)) {
      if (dateISO >= monthStartISO && dateISO <= monthEndISO) {
        map.set(staffId, (map.get(staffId) ?? 0) + 1);
      }
    }
    return map;
  }, [assignments, monthStartISO, monthEndISO]);

  const lastDutyByStaff = useMemo(() => {
    const map = new Map<string, string>();
    const pastDates = Object.entries(assignments)
      .filter(([dateISO]) => dateISO <= todayISO)
      .sort(([a], [b]) => (a < b ? 1 : -1));
    for (const [dateISO, staffId] of pastDates) {
      if (!map.has(staffId)) map.set(staffId, dateISO);
    }
    return map;
  }, [assignments, todayISO]);

  function move(staffId: string, direction: "up" | "down") {
    setDraft((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((e) => e.staffId === staffId);
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return prev;
      const currentStaffId = sorted[idx].staffId;
      const otherStaffId = sorted[swapWith].staffId;
      const currentOrder = sorted[idx].order;
      const otherOrder = sorted[swapWith].order;
      return prev.map((e) => {
        if (e.staffId === currentStaffId) return { ...e, order: otherOrder };
        if (e.staffId === otherStaffId) return { ...e, order: currentOrder };
        return e;
      });
    });
  }

  function updateField(staffId: string, patch: Partial<DutyRotationEntry>) {
    setDraft((prev) => prev.map((e) => (e.staffId === staffId ? { ...e, ...patch } : e)));
  }

  function handleSave() {
    updateRotation(draft);
  }

  function handleRefresh() {
    setDraft([...rotation].sort((a, b) => a.order - b.order));
  }

  const sortedDraft = [...draft].sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">🔁 당직 순번표</h3>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            순번표 저장
          </button>
          <button
            onClick={handleRefresh}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            새로고침
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium">순번</th>
              <th className="px-3 py-2 font-medium">직원명</th>
              <th className="px-3 py-2 font-medium">역할</th>
              <th className="px-3 py-2 font-medium">활성</th>
              <th className="px-3 py-2 font-medium">이번달 배정</th>
              <th className="px-3 py-2 font-medium">마지막 당직</th>
              <th className="px-3 py-2 font-medium">제외 시작</th>
              <th className="px-3 py-2 font-medium">제외 종료</th>
              <th className="px-3 py-2 font-medium">메모</th>
              <th className="px-3 py-2 font-medium">이동</th>
            </tr>
          </thead>
          <tbody>
            {sortedDraft.map((entry, idx) => {
              const staff = staffById.get(entry.staffId);
              if (!staff) return null;
              const lastDuty = lastDutyByStaff.get(entry.staffId);
              return (
                <tr key={entry.staffId} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{staff.name}</td>
                  <td className="px-3 py-2 text-gray-500">{staff.role}</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={entry.active}
                      onChange={(e) => updateField(entry.staffId, { active: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {thisMonthCountByStaff.get(entry.staffId) ?? 0}회
                  </td>
                  <td className="px-3 py-2 text-gray-500">{lastDuty ?? "-"}</td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={entry.excludeStart ?? ""}
                      onChange={(e) =>
                        updateField(entry.staffId, { excludeStart: e.target.value || undefined })
                      }
                      className="w-36 rounded border border-gray-300 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={entry.excludeEnd ?? ""}
                      onChange={(e) =>
                        updateField(entry.staffId, { excludeEnd: e.target.value || undefined })
                      }
                      className="w-36 rounded border border-gray-300 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={entry.memo ?? ""}
                      onChange={(e) => updateField(entry.staffId, { memo: e.target.value })}
                      placeholder="메모"
                      className="w-28 rounded border border-gray-300 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => move(entry.staffId, "up")}
                        disabled={idx === 0}
                        className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(entry.staffId, "down")}
                        disabled={idx === sortedDraft.length - 1}
                        className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
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
