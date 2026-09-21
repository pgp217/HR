# HR — 리바이어던 운영 일정 관리

점심 · 당직 · 휴가를 한 곳에서 관리하는 사내 운영 일정 시스템입니다. Next.js(App Router) + TypeScript + Tailwind CSS로 구현되었으며, 현재는 목업 데이터로 동작합니다.

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속 시 `/operations/staff-schedule`로 이동합니다.

## 구현 현황

- **휴가·연차 관리** (`/operations/staff-schedule/leave`): 직원별 연차 발생/사용/잔여 현황, 휴가 신청 등록, 승인/반려 처리, 월별 휴가 캘린더 — 목업 데이터 기반으로 완전히 동작합니다.
- **오늘 현황** (`/operations/staff-schedule/today`): 오늘의 휴가·근무 현황 요약.
- **점심 일정 / 당직 일정 / 승인 관리 / 설정**: 화면 골격만 구성되어 있으며 기능은 다음 단계에서 구현 예정입니다.

## 프로젝트 구조

- `src/lib/types.ts`, `src/lib/mock-data.ts`: 도메인 타입과 목업 데이터
- `src/components/layout`: 사이드바, 상단 탭 등 공통 레이아웃
- `src/components/leave`: 휴가·연차 관리 기능 컴포넌트
- `src/app/operations/staff-schedule`: 운영 일정 라우트
