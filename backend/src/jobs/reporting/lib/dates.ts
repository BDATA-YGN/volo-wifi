export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfUtcDay(date: Date): Date {
  const d = startOfUtcDay(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function utcDayBucket(date: Date): Date {
  return startOfUtcDay(date);
}

/** Inclusive list of UTC day buckets from `from` through `to`. */
export function eachUtcDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function previousCalendarMonth(ref = new Date()): { year: number; month: number } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  if (m === 0) return { year: y - 1, month: 12 };
  return { year: y, month: m };
}

export function previousCalendarYear(ref = new Date()): number {
  return ref.getUTCFullYear() - 1;
}
