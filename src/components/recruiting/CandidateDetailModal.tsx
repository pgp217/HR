"use client";

import type { Candidate, JobPosting } from "@/lib/recruit-types";
import { computeFitScore, FIT_SCORE_MAX } from "@/lib/recruit-scoring";

interface Props {
  candidate: Candidate;
  jobPostings: JobPosting[];
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || "-"}</dd>
    </div>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-900 text-[11px] font-bold text-white">
          {index}
        </span>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      {children}
    </section>
  );
}

export default function CandidateDetailModal({ candidate: c, jobPostings, onClose }: Props) {
  const score = computeFitScore(c, jobPostings);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{c.name}</h3>
            <p className="text-xs text-gray-400">
              {c.desiredRole || "직무 미기재"} · {c.stage} · 적합도 {score.total}점
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            닫기
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <Section index="01" title="기본 정보 및 학력">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="성명" value={c.name} />
              <Field label="생년" value={c.birthYear} />
              <Field label="연락처" value={c.phone} />
              <Field label="이메일" value={c.email} />
              <Field label="거주 지역" value={c.region} />
              <Field label="희망 직무" value={c.desiredRole} />
              <Field label="포트폴리오" value={c.portfolioUrl} />
              <Field label="희망 연봉" value={c.desiredSalary} />
              <Field label="최종 학력" value={c.educationLevel} />
              <Field label="학교명" value={c.schoolName} />
              <Field label="전공" value={c.major} />
              <Field label="졸업 연월" value={c.graduationDate} />
              <Field label="학점" value={c.gpa} />
              <Field label="어학 점수" value={c.languageScore} />
              <Field label="병역" value={c.militaryStatus} />
              <Field label="보훈 대상" value={c.veteranStatus} />
            </dl>
          </Section>

          <Section index="02" title="경력 사항">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="총 경력" value={c.totalExperience} />
              <Field label="재직 여부" value={c.employmentStatus} />
              <Field label="최근 회사명" value={c.recentCompany} />
              <Field label="부서" value={c.department} />
              <Field label="직위" value={c.position} />
              <Field label="입사일" value={c.joinDate} />
              <Field label="연봉 협의" value={c.salaryNegotiable} />
              <Field label="직전 연봉" value={c.previousSalary} />
            </dl>
          </Section>

          <Section index="03" title="자격 · 스킬 · 평가">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field
                label="보유 자격증"
                value={c.certifications.length > 0 ? c.certifications.join(", ") : ""}
              />
              <Field label="보유 스킬" value={c.skills.length > 0 ? c.skills.join(", ") : ""} />
              <Field label="희망 근무 형태" value={c.workType} />
              <Field label="AI 활용 수준" value={c.aiLevel ? `${c.aiLevel} / 5` : ""} />
              <Field label="영어 회화 수준" value={c.englishLevel ? `${c.englishLevel} / 5` : ""} />
            </dl>
          </Section>

          <Section index="04" title="서술 및 지원 정보">
            <dl className="grid grid-cols-1 gap-4">
              <Field label="주요 업무 및 성과" value={c.mainTasks} />
              <Field label="이전 경력" value={c.previousExperience} />
              <Field label="자기소개" value={c.selfIntroduction} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="입사 가능 시기" value={c.availableStartDate} />
                <Field label="지원 경로" value={c.applicationSource} />
                <Field label="평가 등급" value={c.evaluationGrade} />
                <Field label="담당 리크루터" value={c.recruiterInCharge} />
              </div>
            </dl>
          </Section>

          <Section index="05" title="전형 · 동의 정보">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="전형 단계" value={c.stage} />
              <Field
                label="면접 일시"
                value={c.interviewAt ? new Date(c.interviewAt).toLocaleString("ko-KR") : ""}
              />
              <Field label="지원일" value={new Date(c.createdAt).toLocaleDateString("ko-KR")} />
              <Field
                label="적합도 점수"
                value={`${score.total}점 (경력 ${score.experience}/${FIT_SCORE_MAX.experience} · 즉시투입 ${score.availability}/${FIT_SCORE_MAX.availability} · 어학 ${score.english}/${FIT_SCORE_MAX.english} · AI ${score.ai}/${FIT_SCORE_MAX.ai} · 직무매칭 ${score.roleMatch}/${FIT_SCORE_MAX.roleMatch})`}
              />
              <Field label="개인정보 수집·이용 동의" value={c.consentPrivacy ? "동의" : "미동의"} />
              <Field label="제3자 제공 동의" value={c.consentThirdParty ? "동의" : "미동의"} />
              <Field label="채용 정보 수신 동의" value={c.consentMarketing ? "동의" : "미동의"} />
              <Field label="채용풀 등록" value={c.addToTalentPool ? "등록" : "미등록"} />
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}
