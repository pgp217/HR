# HR — 박기표_HR프로젝트 운영 일정 관리

당직 · 휴가를 한 곳에서 관리하는 사내 운영 일정 시스템입니다. Next.js(App Router) + TypeScript + Tailwind CSS로 구현되었으며, 현재는 목업 데이터로 동작합니다.

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속 시 `/operations/staff-schedule`로 이동합니다.

## 구현 현황

- **휴가·연차 관리** (`/operations/staff-schedule/leave`): 직원별 연차 발생/사용/잔여 현황, 휴가 신청 등록(업무 인수인계자·긴급연락처 포함), 승인/반려/삭제 처리, 월별 휴가 캘린더 — 목업 데이터 기반으로 완전히 동작합니다.
- **승인 관리** (`/operations/staff-schedule/approvals`): 휴가 신청 목록을 공유해 승인/반려/삭제를 동일하게 처리합니다.
- **당직 일정** (`/operations/staff-schedule/duty`): 직원 대기열에서 이름을 달력에 드래그해 당직 배정, 월 자동 배정/리셋, 날짜별 수동 지정.
- **오늘 현황** (`/operations/staff-schedule/today`): 오늘의 휴가·근무 현황 요약.
- **설정**: 화면 골격만 구성되어 있으며 기능은 다음 단계에서 구현 예정입니다.

## 프로젝트 구조

- `src/lib/types.ts`, `src/lib/mock-data.ts`: 도메인 타입과 목업 데이터
- `src/components/layout`: 사이드바, 상단 탭 등 공통 레이아웃
- `src/components/leave`: 휴가·연차 관리 및 승인 관리 공유 컴포넌트
- `src/components/duty`: 당직 일정(드래그 앤 드롭 배정) 컴포넌트
- `src/app/operations/staff-schedule`: 운영 일정 라우트
