import type { LeaveRequest, Staff } from "@/lib/types";

interface Props {
  staffList: Staff[];
  grantedDaysByStaff: Map<string, number>;
  usedDaysByStaff: Map<string, number>;
  pendingByStaff: LeaveRequest[];
}

export default function BalanceTable({
  staffList,
  grantedDaysByStaff,
  usedDaysByStaff,
  pendingByStaff,
}: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">직원별 연차 현황</h3>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
            <th className="px-4 py-2 font-medium">직원</th>
            <th className="px-4 py-2 font-medium">역할</th>
            <th className="px-4 py-2 font-medium">발생 연차</th>
            <th className="px-4 py-2 font-medium">사용</th>
            <th className="px-4 py-2 font-medium">잔여</th>
            <th className="px-4 py-2 font-medium">진행중 신청</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staff) => {
            const granted = grantedDaysByStaff.get(staff.id) ?? 0;
            const used = usedDaysByStaff.get(staff.id) ?? 0;
            const remaining = granted - used;
            const pendingCount = pendingByStaff.filter((r) => r.staffId === staff.id).length;
            return (
              <tr key={staff.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-900">{staff.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{staff.role}</td>
                <td className="px-4 py-2.5 text-gray-700">{granted}일</td>
                <td className="px-4 py-2.5 text-gray-700">{used}일</td>
                <td
                  className={`px-4 py-2.5 font-medium ${
                    remaining <= 3 ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {remaining}일
                </td>
                <td className="px-4 py-2.5">
                  {pendingCount > 0 ? (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {pendingCount}건 대기
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
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
