"use client";

import Link from "next/link";
import { useLeave } from "./LeaveContext";
import RequestList from "./RequestList";

export default function ApprovalsManager() {
  const { requests, staffById, pendingCount, handleDecision, handleDelete } = useLeave();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">승인 관리</h2>
          <p className="text-sm text-gray-500">휴가·연차 신청을 검토하고 승인/반려를 처리합니다.</p>
        </div>
        <Link
          href="/operations/staff-schedule/leave"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          휴가·연차 관리로 이동
        </Link>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-700">승인 대기 중인 휴가 신청</p>
        <p className="mt-1 text-2xl font-bold text-amber-700">{pendingCount}건</p>
      </div>

      <RequestList
        requests={requests}
        staffById={staffById}
        onDecision={handleDecision}
        onDelete={handleDelete}
      />
    </div>
  );
}
