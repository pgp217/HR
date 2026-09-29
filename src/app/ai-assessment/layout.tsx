import Sidebar from "@/components/layout/Sidebar";
import { AssessmentProvider } from "@/components/assessment/AssessmentContext";

export default function AiAssessmentLayout({ children }: LayoutProps<"/ai-assessment">) {
  return (
    <AssessmentProvider>
      <div className="flex h-screen w-full flex-col lg:flex-row">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
            <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span>🤖</span> AI 역량진단
            </h1>
            <p className="text-sm text-gray-500">
              AI 이해·활용빈도·결과물품질·리스크관리·전파도 5개 축으로 AI 활용 역량을 진단합니다.
            </p>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AssessmentProvider>
  );
}
