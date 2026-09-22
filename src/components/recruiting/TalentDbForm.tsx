"use client";

import { useMemo, useState } from "react";
import { staffList } from "@/lib/mock-data";
import type { CandidateInput } from "@/lib/recruit-types";
import {
  APPLICATION_SOURCES,
  CERTIFICATIONS,
  DESIRED_ROLES,
  EDUCATION_LEVELS,
  EMPLOYMENT_STATUSES,
  ENGLISH_LEVELS,
  EVALUATION_GRADES,
  EXCEL_LEVELS,
  EXPERIENCE_RANGES,
  MILITARY_STATUSES,
  REGIONS,
  SALARY_NEGOTIABLE_OPTIONS,
  SKILLS,
  VETERAN_STATUSES,
  WORK_TYPES,
} from "@/lib/recruit-options";
import { useRecruit } from "./RecruitContext";
import { CheckboxGroupField, RadioGroupField, SelectField, TextAreaField, TextField } from "./FormFields";

type Draft = Omit<CandidateInput, "excelLevel" | "englishLevel"> & {
  excelLevel: string;
  englishLevel: string;
};

const emptyDraft: Draft = {
  name: "",
  birthYear: "",
  phone: "",
  email: "",
  region: "",
  desiredRole: "",
  portfolioUrl: "",
  desiredSalary: "",
  educationLevel: "",
  schoolName: "",
  major: "",
  graduationDate: "",
  gpa: "",
  languageScore: "",
  militaryStatus: "",
  veteranStatus: "",
  totalExperience: "",
  employmentStatus: "",
  recentCompany: "",
  department: "",
  position: "",
  joinDate: "",
  salaryNegotiable: "",
  previousSalary: "",
  certifications: [],
  skills: [],
  excelLevel: "",
  englishLevel: "",
  workType: "",
  mainTasks: "",
  previousExperience: "",
  selfIntroduction: "",
  availableStartDate: "",
  applicationSource: "",
  evaluationGrade: "",
  recruiterInCharge: "",
  consentPrivacy: false,
  consentThirdParty: false,
  consentMarketing: false,
  addToTalentPool: false,
};

const TOTAL_FIELD_COUNT = 63;

const requiredChecks: { label: string; isFilled: (d: Draft) => boolean }[] = [
  { label: "성명", isFilled: (d) => d.name.trim() !== "" },
  { label: "생년", isFilled: (d) => d.birthYear.trim() !== "" },
  { label: "연락처", isFilled: (d) => d.phone.trim() !== "" },
  { label: "거주 지역", isFilled: (d) => d.region !== "" },
  { label: "희망 직무", isFilled: (d) => d.desiredRole !== "" },
  { label: "최종 학력", isFilled: (d) => d.educationLevel !== "" },
  { label: "학교명", isFilled: (d) => d.schoolName.trim() !== "" },
  { label: "총 경력", isFilled: (d) => d.totalExperience !== "" },
  { label: "재직 여부", isFilled: (d) => d.employmentStatus !== "" },
  { label: "보유 스킬", isFilled: (d) => d.skills.length > 0 },
  { label: "희망 근무 형태", isFilled: (d) => d.workType !== "" },
  { label: "주요 업무 및 성과", isFilled: (d) => d.mainTasks.trim() !== "" },
  { label: "자기소개", isFilled: (d) => d.selfIntroduction.trim() !== "" },
  { label: "입사 가능 시기", isFilled: (d) => d.availableStartDate.trim() !== "" },
  { label: "개인정보 수집·이용 동의", isFilled: (d) => d.consentPrivacy },
];

export default function TalentDbForm() {
  const { candidates, addCandidate } = useRecruit();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const recruiterOptions = useMemo(() => staffList.map((s) => s.name), []);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const filledRequiredCount = requiredChecks.filter((c) => c.isFilled(draft)).length;
  const missingRequired = requiredChecks.filter((c) => !c.isFilled(draft));
  const progressPercent = Math.round((filledRequiredCount / requiredChecks.length) * 100);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);

    if (missingRequired.length > 0) {
      setError(`필수 항목을 입력해주세요: ${missingRequired.map((c) => c.label).join(", ")}`);
      return;
    }

    setError("");
    const { excelLevel, englishLevel, ...rest } = draft;
    addCandidate({
      ...rest,
      excelLevel: excelLevel ? Number(excelLevel) : null,
      englishLevel: englishLevel ? Number(englishLevel) : null,
    });
    setDraft(emptyDraft);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">인재 DB 등록</h2>
            <p className="text-sm text-gray-500">지원자 이력서 정보를 시스템에 등록합니다.</p>
          </div>
          <span className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">
            입력 항목 {TOTAL_FIELD_COUNT}개
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* 01 기본 정보 및 학력 */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-900 text-[11px] font-bold text-white">
                01
              </span>
              <h3 className="text-sm font-semibold text-gray-900">기본 정보 및 학력</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField label="성명" required value={draft.name} onChange={(v) => set("name", v)} />
              <TextField
                label="생년"
                required
                placeholder="예: 1996"
                value={draft.birthYear}
                onChange={(v) => set("birthYear", v)}
              />
              <TextField
                label="연락처"
                required
                placeholder="010-0000-0000"
                value={draft.phone}
                onChange={(v) => set("phone", v)}
              />
              <TextField
                label="이메일"
                type="email"
                value={draft.email}
                onChange={(v) => set("email", v)}
              />
              <SelectField
                label="거주 지역"
                required
                options={REGIONS}
                value={draft.region}
                onChange={(v) => set("region", v)}
              />
              <SelectField
                label="희망 직무"
                required
                options={DESIRED_ROLES}
                value={draft.desiredRole}
                onChange={(v) => set("desiredRole", v)}
              />
              <TextField
                label="포트폴리오"
                placeholder="https://..."
                value={draft.portfolioUrl}
                onChange={(v) => set("portfolioUrl", v)}
              />
              <TextField
                label="희망 연봉"
                placeholder="예: 4,000만원"
                value={draft.desiredSalary}
                onChange={(v) => set("desiredSalary", v)}
              />
              <SelectField
                label="최종 학력"
                required
                options={EDUCATION_LEVELS}
                value={draft.educationLevel}
                onChange={(v) => set("educationLevel", v)}
              />
              <TextField
                label="학교명"
                required
                value={draft.schoolName}
                onChange={(v) => set("schoolName", v)}
              />
              <TextField label="전공" value={draft.major} onChange={(v) => set("major", v)} />
              <TextField
                label="졸업 연월"
                type="month"
                value={draft.graduationDate}
                onChange={(v) => set("graduationDate", v)}
              />
              <TextField
                label="학점"
                placeholder="예: 3.8/4.5"
                value={draft.gpa}
                onChange={(v) => set("gpa", v)}
              />
              <TextField
                label="어학 점수"
                placeholder="예: TOEIC 900"
                value={draft.languageScore}
                onChange={(v) => set("languageScore", v)}
              />
              <SelectField
                label="병역"
                options={MILITARY_STATUSES}
                value={draft.militaryStatus}
                onChange={(v) => set("militaryStatus", v)}
              />
              <SelectField
                label="보훈 대상"
                options={VETERAN_STATUSES}
                value={draft.veteranStatus}
                onChange={(v) => set("veteranStatus", v)}
              />
            </div>
          </section>

          {/* 02 경력 사항 */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-900 text-[11px] font-bold text-white">
                02
              </span>
              <h3 className="text-sm font-semibold text-gray-900">경력 사항</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                label="총 경력"
                required
                options={EXPERIENCE_RANGES}
                value={draft.totalExperience}
                onChange={(v) => set("totalExperience", v)}
              />
              <SelectField
                label="재직 여부"
                required
                options={EMPLOYMENT_STATUSES}
                value={draft.employmentStatus}
                onChange={(v) => set("employmentStatus", v)}
              />
              <TextField
                label="최근 회사명"
                value={draft.recentCompany}
                onChange={(v) => set("recentCompany", v)}
              />
              <TextField
                label="부서"
                value={draft.department}
                onChange={(v) => set("department", v)}
              />
              <TextField label="직위" value={draft.position} onChange={(v) => set("position", v)} />
              <TextField
                label="입사일"
                type="date"
                value={draft.joinDate}
                onChange={(v) => set("joinDate", v)}
              />
              <SelectField
                label="연봉 협의"
                options={SALARY_NEGOTIABLE_OPTIONS}
                value={draft.salaryNegotiable}
                onChange={(v) => set("salaryNegotiable", v)}
              />
              <TextField
                label="직전 연봉"
                placeholder="예: 3,800만원"
                value={draft.previousSalary}
                onChange={(v) => set("previousSalary", v)}
              />
            </div>
          </section>

          {/* 03 자격 · 스킬 · 평가 */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-900 text-[11px] font-bold text-white">
                03
              </span>
              <h3 className="text-sm font-semibold text-gray-900">자격 · 스킬 · 평가</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CheckboxGroupField
                label="보유 자격증"
                options={CERTIFICATIONS}
                selected={draft.certifications}
                onChange={(v) => set("certifications", v)}
              />
              <CheckboxGroupField
                label="보유 스킬"
                required
                options={SKILLS}
                selected={draft.skills}
                onChange={(v) => set("skills", v)}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
              <RadioGroupField
                label="엑셀 활용 수준"
                options={EXCEL_LEVELS}
                value={draft.excelLevel}
                onChange={(v) => set("excelLevel", v)}
              />
              <RadioGroupField
                label="영어 회화 수준"
                options={ENGLISH_LEVELS}
                value={draft.englishLevel}
                onChange={(v) => set("englishLevel", v)}
              />
              <RadioGroupField
                label="희망 근무 형태"
                required
                options={WORK_TYPES}
                value={draft.workType}
                onChange={(v) => set("workType", v)}
              />
            </div>
          </section>

          {/* 04 서술 및 지원 정보 */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-900 text-[11px] font-bold text-white">
                04
              </span>
              <h3 className="text-sm font-semibold text-gray-900">서술 및 지원 정보</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextAreaField
                label="주요 업무 및 성과"
                required
                value={draft.mainTasks}
                onChange={(v) => set("mainTasks", v)}
              />
              <TextAreaField
                label="이전 경력"
                value={draft.previousExperience}
                onChange={(v) => set("previousExperience", v)}
              />
              <TextAreaField
                label="자기소개"
                required
                value={draft.selfIntroduction}
                onChange={(v) => set("selfIntroduction", v)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="입사 가능 시기"
                  required
                  type="date"
                  value={draft.availableStartDate}
                  onChange={(v) => set("availableStartDate", v)}
                />
                <SelectField
                  label="지원 경로"
                  options={APPLICATION_SOURCES}
                  value={draft.applicationSource}
                  onChange={(v) => set("applicationSource", v)}
                />
                <SelectField
                  label="평가 등급"
                  options={EVALUATION_GRADES}
                  value={draft.evaluationGrade}
                  onChange={(v) => set("evaluationGrade", v)}
                />
                <SelectField
                  label="담당 리크루터"
                  options={recruiterOptions}
                  value={draft.recruiterInCharge}
                  onChange={(v) => set("recruiterInCharge", v)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.consentPrivacy}
                  onChange={(e) => set("consentPrivacy", e.target.checked)}
                />
                개인정보 수집·이용 동의 <span className="text-red-500">*</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.consentThirdParty}
                  onChange={(e) => set("consentThirdParty", e.target.checked)}
                />
                제3자 제공 동의
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.consentMarketing}
                  onChange={(e) => set("consentMarketing", e.target.checked)}
                />
                채용 정보 수신 동의
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.addToTalentPool}
                  onChange={(e) => set("addToTalentPool", e.target.checked)}
                />
                채용풀 등록
              </label>
            </div>
          </section>

          {error && (
            <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
              등록되었습니다.
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              지원자 등록
            </button>
          </div>
        </form>
      </div>

      {/* 우측 패널 */}
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">작성 진행률</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {filledRequiredCount} / {requiredChecks.length}항목
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {missingRequired.length > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              남은 필수 항목: {missingRequired.map((c) => c.label).join(", ")}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">등록 현황</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{candidates.length}건 등록됨</p>
          {candidates.length === 0 ? (
            <p className="mt-2 text-xs text-gray-400">아직 등록된 인재가 없습니다.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {candidates.slice(0, 5).map((c) => (
                <li key={c.id} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                  <p className="font-medium text-gray-900">
                    {c.name} · {c.desiredRole || "직무 미기재"}
                  </p>
                  <p className="mt-0.5 text-gray-400">
                    {new Date(c.createdAt).toLocaleString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    등록
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
