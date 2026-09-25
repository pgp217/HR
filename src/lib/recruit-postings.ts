import type { JobPosting } from "./recruit-types";
import { addDays, today } from "./date";

const t = today();

export const jobPostings: JobPosting[] = [
  { id: "jp1", title: "백엔드 개발자 채용", role: "개발", deadline: addDays(t, 5), status: "모집중" },
  { id: "jp2", title: "퍼포먼스 마케터 채용", role: "마케팅", deadline: addDays(t, 2), status: "모집중" },
  { id: "jp3", title: "UI/UX 디자이너 채용", role: "디자인", deadline: addDays(t, 14), status: "모집중" },
  { id: "jp4", title: "인사 담당자 채용", role: "인사/총무", deadline: addDays(t, -3), status: "마감" },
  { id: "jp5", title: "영업 매니저 채용", role: "영업", deadline: addDays(t, 20), status: "모집중" },
  { id: "jp6", title: "고객지원 담당자 채용", role: "고객지원", deadline: addDays(t, 1), status: "모집중" },
];
