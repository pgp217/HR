import Sidebar from "@/components/layout/Sidebar";
import TopTabs from "@/components/layout/TopTabs";
import { LeaveProvider } from "@/components/leave/LeaveContext";
import { DutyProvider } from "@/components/duty/DutyContext";
import { TripProvider } from "@/components/trip/TripContext";

export default function StaffScheduleLayout({ children }: LayoutProps<"/operations/staff-schedule">) {
  return (
    <LeaveProvider>
      <DutyProvider>
        <TripProvider>
          <div className="flex h-screen w-full flex-col lg:flex-row">
            <Sidebar />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
                <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span>🗓️</span> 운영 일정
                </h1>
                <p className="text-sm text-gray-500">당직 · 휴가를 한 곳에서 관리합니다.</p>
              </header>
              <TopTabs />
              <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">{children}</main>
            </div>
          </div>
        </TripProvider>
      </DutyProvider>
    </LeaveProvider>
  );
}
