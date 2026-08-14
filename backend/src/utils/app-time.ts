import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Platform / business timezone (Myanmar). */
export const APP_TIMEZONE = 'Asia/Yangon';

/**
 * Ensure Node and PG session tooling agree on the app timezone.
 * Call after dotenv load; Docker/Dokploy should also set `TZ=Asia/Yangon`.
 */
export function applyAppTimezone(tz: string = process.env.TZ || APP_TIMEZONE): string {
  const resolved = tz.trim() || APP_TIMEZONE;
  process.env.TZ = resolved;
  return resolved;
}

function bizTz(): string {
  return APP_TIMEZONE;
}

export function appNow(): dayjs.Dayjs {
  return dayjs().tz(bizTz());
}

/** Calendar day key in app timezone (`YYYY-MM-DD`). */
export function appDayKey(date: Date): string {
  return dayjs(date).tz(bizTz()).format('YYYY-MM-DD');
}

export function startOfAppDay(date: Date): Date {
  return dayjs(date).tz(bizTz()).startOf('day').toDate();
}

export function endOfAppDay(date: Date): Date {
  return dayjs(date).tz(bizTz()).endOf('day').toDate();
}

export function addAppDays(date: Date, days: number): Date {
  return dayjs(date).tz(bizTz()).add(days, 'day').toDate();
}

export function appDayBucket(date: Date): Date {
  return startOfAppDay(date);
}

/** Inclusive list of app-timezone day buckets from `from` through `to`. */
export function eachAppDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let cursor = dayjs(from).tz(bizTz()).startOf('day');
  const end = dayjs(to).tz(bizTz()).startOf('day');
  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    days.push(cursor.toDate());
    cursor = cursor.add(1, 'day');
  }
  return days;
}

export function previousCalendarMonth(ref = new Date()): { year: number; month: number } {
  const d = dayjs(ref).tz(bizTz()).subtract(1, 'month');
  return { year: d.year(), month: d.month() + 1 };
}

export function previousCalendarYear(ref = new Date()): number {
  return dayjs(ref).tz(bizTz()).year() - 1;
}

export function startOfAppMonth(date: Date = new Date()): Date {
  return dayjs(date).tz(bizTz()).startOf('month').toDate();
}

export function endOfAppMonth(date: Date = new Date()): Date {
  return dayjs(date).tz(bizTz()).endOf('month').toDate();
}

/** Inclusive Asia/Yangon bounds for a calendar month (`month` is 1–12). */
export function appCalendarMonthRange(
  year: number,
  month: number
): { from: Date; to: Date } {
  const start = dayjs
    .tz(`${year}-${String(month).padStart(2, '0')}-01`, bizTz())
    .startOf('month');
  return { from: start.toDate(), to: start.endOf('month').toDate() };
}

export function resolvePeriodFromPresetDays(
  days: number,
  periodTo: Date = new Date(),
): { periodFrom: Date; periodTo: Date } {
  const end = endOfAppDay(periodTo);
  const start = startOfAppDay(addAppDays(startOfAppDay(periodTo), -(days - 1)));
  return { periodFrom: start, periodTo: end };
}

export function previousAppPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  const ms = periodTo.getTime() - periodFrom.getTime();
  const to = new Date(periodFrom.getTime() - 1);
  const from = startOfAppDay(new Date(to.getTime() - ms));
  return { from, to };
}
