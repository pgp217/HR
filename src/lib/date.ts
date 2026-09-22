export function toISODate(date: Date): string {
  // Build the string from local Y/M/D components, not toISOString() (which
  // converts to UTC first and rolls back a calendar day for any timezone
  // ahead of UTC, e.g. KST) — this must reflect the viewer's local date.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  // Parse the Y/M/D parts directly instead of `new Date(iso)` — a bare
  // "YYYY-MM-DD" string is parsed as UTC midnight by the spec, which can
  // shift to the wrong local calendar day depending on the viewer's timezone.
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${m}. ${d}.(${weekday})`;
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
