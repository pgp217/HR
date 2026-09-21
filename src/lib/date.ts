export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function today(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}. ${d.getDate()}.(${weekday})`;
}

export function isWithinRange(dateISO: string, startISO: string, endISO: string): boolean {
  return dateISO >= startISO && dateISO <= endISO;
}

export function daysBetweenInclusive(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function getMonthMatrix(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = new Array(firstDay.getDay()).fill(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(toISODate(new Date(year, month, d)));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}
