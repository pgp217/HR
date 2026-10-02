import { addDays, today } from "./date";

// AI 기반 면접 일정 자동 배정.
//   - 트랙(패널) 구성: 트랙 1개 = 내부 면접관(차장~부장급) 1명이 회의실
//     하나를 하루 종일 맡는다. 트랙 수 = min(선택한 내부 면접관 수, 선택한
//     외부 면접관 수) — 남는 쪽은 이번 배정에서 쉰다.
//   - 외부 면접관은 트랙에 고정되지 않고 라운드로빈(원 순환법)으로
//     순환한다: 같은 트랙이라도 후보가 바뀔 때마다 짝이 되는 외부 면접관이
//     한 명씩 밀려서, 트랙 수만큼 진행하면 모든 내부·외부 조합이 정확히
//     한 번씩 돌아간다. 같은 두 사람이 하루 종일 계속 짝을 이루며 생기는
//     상호 영향(편향)을 줄이기 위함.
//   - 슬롯 = 면접 20분 + 채점/휴식 10분 = 30분. 근무시간 09:00~18:00에서
//     점심(12:00~13:00)을 뺀 하루 480분을 슬롯 단위로 나눠 쓴다.
//   - 배정은 트랙을 라운드로빈으로 순회하며 채워서, 트랙마다 맡는 인원이
//     최대 1명 차이 안에서 균등하게 나뉜다 — 특정 면접관에게 몰리지 않는다.
//   - 회의실은 트랙마다 하나씩 고정 배정해서, 같은 시간대에 같은 회의실을
//     두 트랙이 같이 쓰는 충돌 자체가 애초에 생기지 않게 한다.
//   - 노쇼 대응은 슬롯 사이 여유 시간이 아니라 결석 처리(당겨 배정)
//     기능으로 처리한다 — 노쇼 후보의 슬롯을 지우고 뒤 순번들이 각자 바로
//     앞 사람의 시간을 물려받아 당겨지므로, 슬롯이 처음부터 빈틈없이
//     붙어 있어도 당겨 배정은 그대로 성립한다.

export const SLOT_MINUTES = 30; // 면접 20분 + 채점 10분
export const INTERVIEW_MINUTES = 20;
export const SCORING_MINUTES = 10;
export const WORK_START = "09:00";
export const WORK_END = "18:00";
export const LUNCH_START = "12:00";
export const LUNCH_END = "13:00";
export const WORK_MINUTES_PER_DAY = 8 * 60; // 9시간 근무 - 점심 1시간

export const EXTERNAL_INTERVIEWERS = ["외부 면접관 A", "외부 면접관 B", "외부 면접관 C", "외부 면접관 D"];

export const MEETING_ROOMS = ["회의실 A", "회의실 B", "회의실 C", "회의실 D"];

export interface Panel {
  id: string;
  internalInterviewer: string;
  room: string;
}

export interface InterviewAssignment {
  candidateId: string;
  panelId: string;
  internalInterviewer: string;
  externalInterviewer: string;
  room: string;
  date: string; // ISO
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface ScheduleSummary {
  targetCount: number;
  panelCount: number;
  perPanelCount: number; // 패널당 처리 인원
  totalMinutes: number; // 총 소요 시간(분) — 패널 병렬 처리 기준
  daysNeeded: number;
}

function buildPanels(internalNames: string[], externalNames: string[]): Panel[] {
  const count = Math.min(internalNames.length, externalNames.length);
  return Array.from({ length: count }, (_, i) => ({
    id: `panel-${i + 1}`,
    internalInterviewer: internalNames[i],
    room: MEETING_ROOMS[i % MEETING_ROOMS.length],
  }));
}

/** 분을 "N시간 M분" 같은 표기로 바꾼다. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// 한 세션(오전 또는 오후) 안의 슬롯 시작 시각들.
function sessionSlotStarts(sessionStart: number, sessionEnd: number): number[] {
  const starts: number[] = [];
  for (let t = sessionStart; t + SLOT_MINUTES <= sessionEnd; t += SLOT_MINUTES) {
    starts.push(t);
  }
  return starts;
}

// 하루치 슬롯 시작 시각 목록(09:00~12:00, 13:00~18:00을 30분 단위로).
function daySlotStarts(): string[] {
  const workStart = hhmmToMinutes(WORK_START);
  const lunchStart = hhmmToMinutes(LUNCH_START);
  const lunchEnd = hhmmToMinutes(LUNCH_END);
  const workEnd = hhmmToMinutes(WORK_END);
  const morning = sessionSlotStarts(workStart, lunchStart);
  const afternoon = sessionSlotStarts(lunchEnd, workEnd);
  return [...morning, ...afternoon].map(minutesToHHMM);
}

export const SLOTS_PER_DAY_PER_PANEL = daySlotStarts().length;

function isWeekend(dateISO: string): boolean {
  const [y, m, d] = dateISO.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

// 평일만 골라 다음 근무일들을 순서대로 만들어낸다(오늘부터 시작, 오늘이
// 주말이면 다음 평일부터).
function* workDays(startDate: Date) {
  let offset = 0;
  while (true) {
    const dateISO = addDays(startDate, offset);
    if (!isWeekend(dateISO)) yield dateISO;
    offset++;
  }
}

export function computeScheduleSummary(targetCount: number, panelCount: number): ScheduleSummary {
  if (panelCount === 0 || targetCount === 0) {
    return { targetCount, panelCount, perPanelCount: 0, totalMinutes: 0, daysNeeded: 0 };
  }
  const perPanelCount = Math.ceil(targetCount / panelCount);
  const totalMinutes = perPanelCount * SLOT_MINUTES;
  const capacityPerDay = panelCount * SLOTS_PER_DAY_PER_PANEL;
  const daysNeeded = Math.ceil(targetCount / capacityPerDay);
  return { targetCount, panelCount, perPanelCount, totalMinutes, daysNeeded };
}

/**
 * candidateIds를 트랙(내부 면접관+회의실)에 라운드로빈으로 순서대로
 * 배정하고, 각 트랙은 근무일의 슬롯을 앞에서부터 채워나간다. 같은 트랙
 * 안에서도 외부 면접관은 후보가 바뀔 때마다 원 순환법으로 한 칸씩
 * 돌아가서, 트랙 수만큼 진행되면 모든 내부·외부 조합이 정확히 한 번씩
 * 나온다(같은 시간대에 같은 외부 면접관이 두 트랙에 겹쳐 배정되는 일은
 * 없다). 트랙 수가 0이면 빈 배열을 반환한다.
 */
export function generateSchedule(
  candidateIds: string[],
  internalNames: string[],
  externalNames: string[]
): { panels: Panel[]; assignments: InterviewAssignment[] } {
  const panels = buildPanels(internalNames, externalNames);
  if (panels.length === 0 || candidateIds.length === 0) return { panels, assignments: [] };

  const trackCount = panels.length;
  const slotStarts = daySlotStarts();
  const dayIterators = panels.map(() => workDays(today()));
  // 트랙별로 "다음에 쓸 슬롯" 커서(날짜 + 그 날짜 안 슬롯 인덱스)와, 외부
  // 면접관 순환을 위한 라운드 카운터를 관리한다.
  const cursors = panels.map(() => ({ date: "", slotIndex: slotStarts.length, round: 0 }));

  function nextSlot(panelIdx: number): { date: string; start: string; end: string } {
    const cursor = cursors[panelIdx];
    if (cursor.slotIndex >= slotStarts.length) {
      cursor.date = dayIterators[panelIdx].next().value as string;
      cursor.slotIndex = 0;
    }
    const start = slotStarts[cursor.slotIndex];
    cursor.slotIndex++;
    const end = minutesToHHMM(hhmmToMinutes(start) + SLOT_MINUTES);
    return { date: cursor.date, start, end };
  }

  const assignments: InterviewAssignment[] = candidateIds.map((candidateId, i) => {
    const panelIdx = i % panels.length;
    const panel = panels[panelIdx];
    const cursor = cursors[panelIdx];
    const externalInterviewer = externalNames[(panelIdx + cursor.round) % trackCount];
    cursor.round++;
    const { date, start, end } = nextSlot(panelIdx);
    return {
      candidateId,
      panelId: panel.id,
      internalInterviewer: panel.internalInterviewer,
      externalInterviewer,
      room: panel.room,
      date,
      startTime: start,
      endTime: end,
    };
  });

  return { panels, assignments };
}

/**
 * 결석 처리: candidateId의 배정을 없애고, 같은 패널·같은 날 그 뒤 시간대에
 * 잡혀 있던 나머지 후보들을 한 칸씩 앞당긴다(각자 바로 앞 사람의 시간을
 * 물려받음).
 */
export function removeAndCompactAssignment(
  assignments: InterviewAssignment[],
  candidateId: string
): InterviewAssignment[] {
  const target = assignments.find((a) => a.candidateId === candidateId);
  if (!target) return assignments;

  const rest = assignments.filter((a) => a.candidateId !== candidateId);
  const later = rest
    .filter((a) => a.panelId === target.panelId && a.date === target.date && a.startTime > target.startTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const availableTimes = [
    { start: target.startTime, end: target.endTime },
    ...later.slice(0, -1).map((a) => ({ start: a.startTime, end: a.endTime })),
  ];

  return rest.map((a) => {
    const idx = later.findIndex((x) => x.candidateId === a.candidateId);
    if (idx === -1) return a;
    return { ...a, startTime: availableTimes[idx].start, endTime: availableTimes[idx].end };
  });
}

/** 대기명단 후보를 노쇼 위험 후보의 배정(패널·회의실·일시)에 그대로 대입한다. */
export function replaceAssignmentCandidate(
  assignments: InterviewAssignment[],
  oldCandidateId: string,
  newCandidateId: string
): InterviewAssignment[] {
  return assignments.map((a) =>
    a.candidateId === oldCandidateId ? { ...a, candidateId: newCandidateId } : a
  );
}
