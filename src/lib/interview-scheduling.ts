import { addDays, today } from "./date";

// AI 기반 면접 일정 자동 배정.
//   - 패널 구성: 패널 1개 = 내부 면접관(차장~부장급) 1명 + 외부 면접관 1명.
//     패널 수 = min(선택한 내부 면접관 수, 선택한 외부 면접관 수) — 1:1로만
//     짝을 지으므로 남는 쪽은 이번 배정에서 쉰다.
//   - 슬롯 = 면접 20분 + 채점/휴식 10분 = 30분. 근무시간 09:00~18:00에서
//     점심(12:00~13:00)을 뺀 하루 480분을 슬롯 단위로 나눠 쓴다.
//   - 배정은 패널을 라운드로빈으로 순회하며 채워서, 패널(=면접관 페어)마다
//     맡는 인원이 최대 1명 차이 안에서 균등하게 나뉜다 — 특정 면접관에게
//     몰리지 않는다.
//   - 회의실은 패널마다 하나씩 고정 배정해서, 같은 시간대에 같은 회의실을
//     두 패널이 같이 쓰는 충돌 자체가 애초에 생기지 않게 한다.

export const SLOT_MINUTES = 30; // 면접 20분 + 채점 10분
export const INTERVIEW_MINUTES = 20;
export const SCORING_MINUTES = 10;
export const WORK_START = "09:00";
export const WORK_END = "18:00";
export const LUNCH_START = "12:00";
export const LUNCH_END = "13:00";
export const WORK_MINUTES_PER_DAY = 8 * 60; // 9시간 근무 - 점심 1시간
export const SLOTS_PER_DAY_PER_PANEL = Math.floor(WORK_MINUTES_PER_DAY / SLOT_MINUTES); // 16

export const EXTERNAL_INTERVIEWERS = ["외부 면접관 A", "외부 면접관 B", "외부 면접관 C", "외부 면접관 D"];

export const MEETING_ROOMS = ["회의실 A", "회의실 B", "회의실 C", "회의실 D"];

export interface Panel {
  id: string;
  internalInterviewer: string;
  externalInterviewer: string;
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
    externalInterviewer: externalNames[i],
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

// 하루치 슬롯 시작 시각 목록(09:00~12:00, 13:00~18:00을 30분 단위로).
function daySlotStarts(): string[] {
  const slots: string[] = [];
  const workStart = hhmmToMinutes(WORK_START);
  const lunchStart = hhmmToMinutes(LUNCH_START);
  const lunchEnd = hhmmToMinutes(LUNCH_END);
  const workEnd = hhmmToMinutes(WORK_END);
  for (let t = workStart; t + SLOT_MINUTES <= lunchStart; t += SLOT_MINUTES) slots.push(minutesToHHMM(t));
  for (let t = lunchEnd; t + SLOT_MINUTES <= workEnd; t += SLOT_MINUTES) slots.push(minutesToHHMM(t));
  return slots;
}

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
 * candidateIds를 패널에 라운드로빈으로 순서대로 배정하고, 각 패널은 근무일의
 * 슬롯을 앞에서부터 채워나간다. 패널 수가 0이면 빈 배열을 반환한다.
 */
export function generateSchedule(
  candidateIds: string[],
  internalNames: string[],
  externalNames: string[]
): { panels: Panel[]; assignments: InterviewAssignment[] } {
  const panels = buildPanels(internalNames, externalNames);
  if (panels.length === 0 || candidateIds.length === 0) return { panels, assignments: [] };

  const slotStarts = daySlotStarts();
  const dayIterators = panels.map(() => workDays(today()));
  // 패널별로 "다음에 쓸 슬롯" 커서를 관리한다: 현재 날짜 + 그 날짜 안에서 몇
  // 번째 슬롯까지 썼는지.
  const cursors = panels.map(() => ({ date: "", slotIndex: slotStarts.length }));

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
    const { date, start, end } = nextSlot(panelIdx);
    return {
      candidateId,
      panelId: panel.id,
      internalInterviewer: panel.internalInterviewer,
      externalInterviewer: panel.externalInterviewer,
      room: panel.room,
      date,
      startTime: start,
      endTime: end,
    };
  });

  return { panels, assignments };
}
