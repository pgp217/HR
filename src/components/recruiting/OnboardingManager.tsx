"use client";

import { useMemo } from "react";
import { staffList } from "@/lib/mock-data";
import { formatKoreanDate, toISODate, today } from "@/lib/date";
import { useRecruit } from "./RecruitContext";

export default function OnboardingManager() {
  const { candidates, onboardingTasks, toggleOnboardingTask, updateOnboardingTask, ensureOnboardingTasks } =
    useRecruit();

  const todayISO = toISODate(today());
  const hires = useMemo(() => candidates.filter((c) => c.stage === "합격"), [candidates]);

  const totalTasks = onboardingTasks.filter((t) => hires.some((h) => h.id === t.candidateId));
  const totalDone = totalTasks.filter((t) => t.done).length;
  const overdueTasks = totalTasks.filter((t) => !t.done && t.dueDate < todayISO);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">입사자 온보딩</h2>
        <p className="text-sm text-gray-500">
          합격이 확정된 지원자의 입사 준비 체크리스트를 관리합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">온보딩 대상</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{hires.length}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">전체 체크리스트</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalDone} / {totalTasks.length}
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 md:col-span-2">
          <p className="text-sm text-red-600">지연 항목</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{overdueTasks.length}건</p>
        </div>
      </div>

      {hires.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-400">
          아직 합격 처리된 지원자가 없습니다. 채용 대시보드에서 전형 단계를 &ldquo;합격&rdquo;으로
          바꾸면 이곳에 체크리스트가 자동으로 생성됩니다.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {hires.map((hire) => {
            const tasks = onboardingTasks
              .filter((t) => t.candidateId === hire.id)
              .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
            const done = tasks.filter((t) => t.done).length;
            const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
            const hireOverdue = tasks.filter((t) => !t.done && t.dueDate < todayISO).length;

            return (
              <div key={hire.id} className="rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {hire.name}{" "}
                      <span className="font-normal text-gray-400">
                        · {hire.desiredRole || "직무 미기재"}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">입사 가능 시기 {hire.availableStartDate || "-"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {hireOverdue > 0 && (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        지연 {hireOverdue}건
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {done}/{tasks.length} ({percent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {tasks.length === 0 ? (
                  <div className="flex items-center justify-between px-4 py-4 text-sm text-gray-400">
                    체크리스트가 아직 생성되지 않았습니다.
                    <button
                      onClick={() => ensureOnboardingTasks(hire.id)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      체크리스트 생성
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                        <th className="px-4 py-2 font-medium">완료</th>
                        <th className="px-4 py-2 font-medium">항목</th>
                        <th className="px-4 py-2 font-medium">담당자</th>
                        <th className="px-4 py-2 font-medium">기한</th>
                        <th className="px-4 py-2 font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => {
                        const isOverdue = !task.done && task.dueDate < todayISO;
                        return (
                          <tr key={task.id} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-2.5">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => toggleOnboardingTask(task.id)}
                              />
                            </td>
                            <td
                              className={`px-4 py-2.5 ${
                                task.done ? "text-gray-400 line-through" : "text-gray-900"
                              }`}
                            >
                              {task.title}
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={task.assignee}
                                onChange={(e) =>
                                  updateOnboardingTask(task.id, { assignee: e.target.value })
                                }
                                className="rounded border border-gray-300 px-2 py-1 text-xs"
                              >
                                {staffList.map((s) => (
                                  <option key={s.id} value={s.name}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500">
                              <input
                                type="date"
                                value={task.dueDate}
                                onChange={(e) =>
                                  updateOnboardingTask(task.id, { dueDate: e.target.value })
                                }
                                className="rounded border border-gray-300 px-2 py-1 text-xs"
                              />
                              <span className="ml-2 text-xs text-gray-400">
                                {formatKoreanDate(task.dueDate)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {task.done ? (
                                <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                  완료
                                </span>
                              ) : isOverdue ? (
                                <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                  지연
                                </span>
                              ) : (
                                <span className="rounded bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                                  예정
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
