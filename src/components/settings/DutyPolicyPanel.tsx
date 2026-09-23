"use client";

import { useState } from "react";
import { useDuty } from "@/components/duty/DutyContext";

export default function DutyPolicyPanel() {
  const { policy, updatePolicy } = useDuty();
  const [draft, setDraft] = useState(policy);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    updatePolicy(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">📋 당직 정책</h3>
      <p className="mt-1 text-xs text-gray-400">
        당직 자동 배정과 선택 마감 규칙을 설정합니다.
      </p>

      <div className="mt-4 max-w-xs">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">당일 선택 마감 (HH:mm)</span>
          <input
            type="time"
            value={draft.selectionDeadline}
            onChange={(e) => setDraft((d) => ({ ...d, selectionDeadline: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.weekendIncluded}
            onChange={(e) => setDraft((d) => ({ ...d, weekendIncluded: e.target.checked }))}
          />
          당직 — 주말 포함
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.holidayIncluded}
            onChange={(e) => setDraft((d) => ({ ...d, holidayIncluded: e.target.checked }))}
          />
          당직 — 공휴일 포함
          <span className="text-xs text-gray-400">(공휴일 데이터 연동 전까지는 저장만 됩니다)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.autoExcludeOnLeave}
            onChange={(e) => setDraft((d) => ({ ...d, autoExcludeOnLeave: e.target.checked }))}
          />
          휴가자 자동 제외
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.excludeEntryLevel}
            onChange={(e) => setDraft((d) => ({ ...d, excludeEntryLevel: e.target.checked }))}
          />
          사원 제외
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.excludeDeptHead}
            onChange={(e) => setDraft((d) => ({ ...d, excludeDeptHead: e.target.checked }))}
          />
          부장 제외
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          정책 저장
        </button>
        {saved && <span className="text-xs text-green-600">저장되었습니다.</span>}
      </div>
    </div>
  );
}
