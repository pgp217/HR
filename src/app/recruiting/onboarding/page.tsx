import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white py-24 text-center">
      <p className="text-4xl">🚧</p>
      <h2 className="text-base font-semibold text-gray-900">입사자 온보딩</h2>
      <p className="max-w-sm text-sm text-gray-500">
        합격자 입사 준비 체크리스트(근로계약서 서명, 계정 발급, 장비 지급, 교육 일정 안내 등)와
        진행률 관리는 다음 단계에서 구현됩니다.
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
