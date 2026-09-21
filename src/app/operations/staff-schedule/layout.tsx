import Sidebar from "@/components/layout/Sidebar";
import TopTabs from "@/components/layout/TopTabs";
import { LeaveProvider } from "@/components/leave/LeaveContext";

export default function StaffScheduleLayout({ children }: LayoutProps<"/operations/staff-schedule">) {
  return (
    <LeaveProvider>
      <div className="flex h-screen w-full">
        <Sidebar activeHref="/operations/staff-schedule" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="border-b border-gray-200 bg-white px-6 py-4">
            <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span>🗓️</span> 운영 일정
            </h1>
            <p className="text-sm text-gray-500">점심 · 당직 · 휴가를 한 곳에서 관리합니다.</p>
          </header>
          <TopTabs />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
        </div>
      </div>
    </LeaveProvider>
  );
}
