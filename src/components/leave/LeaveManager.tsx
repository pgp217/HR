"use client";

import { useState } from "react";
import { useLeave } from "./LeaveContext";
import SummaryCards from "./SummaryCards";
import BalanceTable from "./BalanceTable";
import RequestList from "./RequestList";
import RequestFormModal from "./RequestFormModal";
import LeaveCalendar from "./LeaveCalendar";

export default function LeaveManager() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const {
    requests,
    staffList,
    staffById,
    grantedDaysByStaff,
    usedDaysByStaff,
    todayOnLeaveCount,
    pendingCount,
    thisMonthUsedDays,
    totalRemainingDays,
    handleDecision,
    handleCreate,
    handleDelete,
  } = useLeave();

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">휴가·연차 관리</h2>
          <p className="text-sm text-gray-500">직원별 연차 현황과 휴가 신청을 관리합니다.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 휴가 신청 등록
        </button>
      </div>

      <SummaryCards
        todayOnLeaveCount={todayOnLeaveCount}
        pendingCount={pendingCount}
        thisMonthUsedDays={thisMonthUsedDays}
        totalRemainingDays={totalRemainingDays}
      />

      <LeaveCalendar
        requests={requests.filter((r) => r.status === "승인")}
        staffById={staffById}
      />

      <BalanceTable
        staffList={staffList}
        grantedDaysByStaff={grantedDaysByStaff}
        usedDaysByStaff={usedDaysByStaff}
        pendingByStaff={requests.filter((r) => r.status === "승인대기")}
      />

      <RequestList
        requests={requests}
        staffById={staffById}
        onDecision={handleDecision}
        onDelete={handleDelete}
      />

      {isFormOpen && (
        <RequestFormModal
          staffList={staffList}
          defaultStart={todayISO}
          defaultEnd={todayISO}
          onSubmit={(input) => {
            handleCreate(input);
            setIsFormOpen(false);
          }}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
