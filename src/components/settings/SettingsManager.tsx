"use client";

import DutyPolicyPanel from "./DutyPolicyPanel";
import LeaveGrantsPanel from "./LeaveGrantsPanel";
import DutyRotationPanel from "./DutyRotationPanel";

export default function SettingsManager() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">설정</h2>
        <p className="text-sm text-gray-500">당직 규칙, 연차 부여, 당직 순번표를 관리합니다.</p>
      </div>

      <DutyPolicyPanel />
      <LeaveGrantsPanel />
      <DutyRotationPanel />
    </div>
  );
}
