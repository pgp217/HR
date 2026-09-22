import Link from "next/link";

export default function RecruitDashboardPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white py-24 text-center">
      <p className="text-4xl">🚧</p>
      <h2 className="text-base font-semibold text-gray-900">채용 대시보드</h2>
      <p className="max-w-sm text-sm text-gray-500">
        공고별/직무별 지원자 수, 전형 단계별 현황, 오늘 예정된 면접 등은 다음 단계에서
        구현됩니다.
      </p>
      <Link
        href="/recruiting/talent-db"
        className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        인재 DB 등록으로 이동
      </Link>
    </div>
  );
}
