/**
 * Reporting day helpers — calendar days use the app timezone (Asia/Yangon).
 * Function names keep a historical `Utc` suffix for call-site stability.
 */
export {
  startOfAppDay as startOfUtcDay,
  endOfAppDay as endOfUtcDay,
  addAppDays as addUtcDays,
  appDayBucket as utcDayBucket,
  eachAppDay as eachUtcDay,
  previousCalendarMonth,
  previousCalendarYear,
} from '@/utils/app-time';
