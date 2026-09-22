import Sidebar from "@/components/layout/Sidebar";
import RecruitTopTabs from "@/components/recruiting/RecruitTopTabs";
import { RecruitProvider } from "@/components/recruiting/RecruitContext";

export default function RecruitingLayout({ children }: LayoutProps<"/recruiting">) {
  return (
    <RecruitProvider>
      <div className="flex h-screen w-full">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="border-b border-gray-200 bg-white px-6 py-4">
            <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span>🧑‍💼</span> 채용
            </h1>
            <p className="text-sm text-gray-500">
              인재 DB 등록부터 온보딩까지 채용 프로세스를 관리합니다.
            </p>
          </header>
          <RecruitTopTabs />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
        </div>
      </div>
    </RecruitProvider>
  );
}
