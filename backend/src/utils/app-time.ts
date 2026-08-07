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

export function appNow(): dayjs.Dayjs {
  return dayjs().tz(process.env.TZ || APP_TIMEZONE);
}

/** Calendar day key in app timezone (`YYYY-MM-DD`). */
export function appDayKey(date: Date): string {
  return dayjs(date)
    .tz(process.env.TZ || APP_TIMEZONE)
    .format('YYYY-MM-DD');
}

export function startOfAppDay(date: Date): Date {
  return dayjs(date)
    .tz(process.env.TZ || APP_TIMEZONE)
    .startOf('day')
    .toDate();
}

export function endOfAppDay(date: Date): Date {
  return dayjs(date)
    .tz(process.env.TZ || APP_TIMEZONE)
    .endOf('day')
    .toDate();
}

export function addAppDays(date: Date, days: number): Date {
  return dayjs(date)
    .tz(process.env.TZ || APP_TIMEZONE)
    .add(days, 'day')
    .toDate();
}

export function appDayBucket(date: Date): Date {
  return startOfAppDay(date);
}

/** Inclusive list of app-timezone day buckets from `from` through `to`. */
export function eachAppDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let cursor = dayjs(from).tz(process.env.TZ || APP_TIMEZONE).startOf('day');
  const end = dayjs(to).tz(process.env.TZ || APP_TIMEZONE).startOf('day');
  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    days.push(cursor.toDate());
    cursor = cursor.add(1, 'day');
  }
  return days;
}

export function previousCalendarMonth(ref = new Date()): { year: number; month: number } {
  const d = dayjs(ref).tz(process.env.TZ || APP_TIMEZONE).subtract(1, 'month');
  return { year: d.year(), month: d.month() + 1 };
}

export function previousCalendarYear(ref = new Date()): number {
  return dayjs(ref).tz(process.env.TZ || APP_TIMEZONE).year() - 1;
}

export function startOfAppMonth(date: Date = new Date()): Date {
  return dayjs(date)
    .tz(process.env.TZ || APP_TIMEZONE)
    .startOf('month')
    .toDate();
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
