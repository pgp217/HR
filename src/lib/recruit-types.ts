export type RecruitStage = "서류" | "면접" | "최종" | "합격" | "불합격";

export interface Candidate {
  id: string;
  createdAt: string; // ISO datetime

  // 01 기본 정보 및 학력
  name: string;
  birthYear: string;
  phone: string;
  email: string;
  region: string;
  desiredRole: string;
  portfolioUrl: string;
  desiredSalary: string;
  educationLevel: string;
  schoolName: string;
  major: string;
  graduationDate: string; // ISO date
  gpa: string;
  languageScore: string;
  militaryStatus: string;
  veteranStatus: string;

  // 02 경력 사항
  totalExperience: string;
  employmentStatus: string;
  recentCompany: string;
  department: string;
  position: string;
  joinDate: string; // ISO date
  salaryNegotiable: string;
  previousSalary: string;

  // 03 자격 · 스킬 · 평가
  certifications: string[];
  skills: string[];
  excelLevel: number | null;
  englishLevel: number | null;
  workType: string;

  // 04 서술 및 지원 정보
  mainTasks: string;
  previousExperience: string;
  selfIntroduction: string;
  availableStartDate: string; // ISO date
  applicationSource: string;
  evaluationGrade: string;
  recruiterInCharge: string;

  // 개인정보 동의
  consentPrivacy: boolean;
  consentThirdParty: boolean;
  consentMarketing: boolean;
  addToTalentPool: boolean;

  // 채용 대시보드/온보딩 연계용
  stage: RecruitStage;
  interviewAt?: string; // ISO datetime, 면접 일정
}

export type CandidateInput = Omit<Candidate, "id" | "createdAt" | "stage" | "interviewAt">;

export type PostingStatus = "모집중" | "마감";

export interface JobPosting {
  id: string;
  title: string;
  role: string; // desiredRole과 매칭되는 직무
  deadline: string; // ISO date
  status: PostingStatus;
}

export interface OnboardingTask {
  id: string;
  candidateId: string;
  title: string;
  assignee: string;
  dueDate: string; // ISO date
  done: boolean;
}
