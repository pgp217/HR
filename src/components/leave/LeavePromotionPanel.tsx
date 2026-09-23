"use client";

import { useMemo, useState } from "react";
import { useLeave } from "./LeaveContext";
import { CURRENT_YEAR } from "@/lib/mock-data";
import { toISODate, today } from "@/lib/date";
import { getPromotionStage, type PromotionStage } from "@/lib/leave-promotion";

const todayISO = toISODate(today());

const stageStyles: Record<PromotionStage, string> = {
  대상아님: "bg-gray-50 text-gray-400",
  "1차대기": "bg-gray-50 text-gray-500",
  "1차대상": "bg-amber-50 text-amber-700",
  근로자응답대기: "bg-blue-50 text-blue-700",
  "2차대상": "bg-red-50 text-red-700",
  완료: "bg-green-50 text-green-700",
};

const stagePriority: Record<PromotionStage, number> = {
  "2차대상": 0,
  "1차대상": 1,
  근로자응답대기: 2,
  완료: 3,
  "1차대기": 4,
  대상아님: 5,
};

export default function LeavePromotionPanel() {
  const {
    staffList,
    remainingDaysByStaff,
    promotionNotices,
    sendFirstNotice,
    recordEmployeeResponse,
    sendSecondNotice,
  } = useLeave();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftDates, setDraftDates] = useState("");

  const noticeByStaffId = useMemo(
    () => new Map(promotionNotices.map((n) => [n.staffId, n])),
    [promotionNotices]
  );

  const rows = useMemo(() => {
    return staffList
      .map((staff) => {
        const remaining = remainingDaysByStaff.get(staff.id) ?? 0;
        const notice = noticeByStaffId.get(staff.id);
        const stage = getPromotionStage(todayISO, CURRENT_YEAR, remaining, notice);
        return { staff, remaining, notice, stage };
      })
      .filter((r) => r.stage !== "대상아님")
      .sort((a, b) => stagePriority[a.stage] - stagePriority[b.stage]);
  }, [staffList, remainingDaysByStaff, noticeByStaffId]);

  const actionNeededCount = rows.filter(
    (r) => r.stage === "1차대상" || r.stage === "2차대상"
  ).length;

  function startEditing(staffId: string) {
    setEditingId(staffId);
    setDraftDates("");
  }

  function submitResponse(staffId: string) {
    recordEmployeeResponse(staffId, draftDates.trim() || "-");
    setEditingId(null);
  }

  function submitSecondNotice(staffId: string) {
    sendSecondNotice(staffId, draftDates.trim() || "-");
    setEditingId(null);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">연차 사용 촉진 (근로기준법 제61조)</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            1차 촉구(7/1~7/10) → 근로자 응답(10일 이내) → 미응답 시 2차 통보(~11/1) 순으로 진행합니다.
          </p>
        </div>
        {actionNeededCount > 0 && (
          <span className="rounded bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            조치 필요 {actionNeededCount}명
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-medium">직원</th>
              <th className="px-4 py-2 font-medium">역할</th>
              <th className="px-4 py-2 font-medium">잔여 연차</th>
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">1차 촉구일</th>
              <th className="px-4 py-2 font-medium">근로자 응답</th>
              <th className="px-4 py-2 font-medium">2차 통보</th>
              <th className="px-4 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  촉진 대상 직원이 없습니다.
                </td>
              </tr>
            )}
            {rows.map(({ staff, remaining, notice, stage }) => {
              const isEditing = editingId === staff.id;
              return (
                <tr key={staff.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{staff.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{staff.role}</td>
                  <td className="px-4 py-2.5 text-gray-700">{remaining}일</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${stageStyles[stage]}`}>
                      {stage}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{notice?.firstNoticeAt ?? "-"}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {notice?.employeeSpecifiedAt ? (
                      <span title={notice.employeeSpecifiedAt}>{notice.employeeSpecifiedDates}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {notice?.secondNoticeAt ? (
                      <span title={notice.secondNoticeAt}>{notice.secondNoticeDates}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {stage === "1차대상" && (
                      <button
                        onClick={() => sendFirstNotice(staff.id)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        1차 촉구 발송
                      </button>
                    )}
                    {stage === "근로자응답대기" &&
                      (isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={draftDates}
                            onChange={(e) => setDraftDates(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitResponse(staff.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            placeholder="예: 12/22~12/24"
                            className="w-28 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                          />
                          <button
                            onClick={() => submitResponse(staff.id)}
                            className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(staff.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          근로자 응답 기록
                        </button>
                      ))}
                    {stage === "2차대상" &&
                      (isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={draftDates}
                            onChange={(e) => setDraftDates(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitSecondNotice(staff.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            placeholder="예: 12/21~12/23"
                            className="w-28 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                          />
                          <button
                            onClick={() => submitSecondNotice(staff.id)}
                            className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            발송
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(staff.id)}
                          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          2차 통보 발송
                        </button>
                      ))}
                    {(stage === "완료" || stage === "1차대기") && (
                      <span className="text-xs text-gray-300">-</span>
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
