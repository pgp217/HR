"use client";

import { useRecruit } from "./RecruitContext";

// 포트폴리오 데모용 컨트롤. 보는 사람이 이전에 뭘 건드렸든, 버튼 한 번으로
// 항상 같은 큐레이션된 데모 상태를 보장한다. "초기화"로 비워서 하드코딩된
// 가짜 화면이 아니라는 걸 보여준 뒤 "불러오기"로 다시 채우는 식으로도
// 쓸 수 있다.
export default function RecruitDemoControls() {
  const { loadDemoData, resetDemoData } = useRecruit();

  function handleLoad() {
    const confirmed = window.confirm(
      "데모 데이터를 불러올까요? 현재 지원자·면접 일정·온보딩 데이터가 모두 교체됩니다."
    );
    if (confirmed) loadDemoData();
  }

  function handleReset() {
    const confirmed = window.confirm(
      "채용 데이터를 전부 초기화할까요? 지원자·면접 일정·온보딩 체크리스트가 모두 삭제됩니다."
    );
    if (confirmed) resetDemoData();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLoad}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
      >
        데모 데이터 불러오기
      </button>
      <button
        onClick={handleReset}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
      >
        초기화
      </button>
    </div>
  );
}
