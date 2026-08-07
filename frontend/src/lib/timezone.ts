import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Platform / business timezone (Myanmar). Keep in sync with backend `APP_TIMEZONE`. */
export const APP_TIMEZONE = "Asia/Yangon";

let configured = false;

/** Call once at app bootstrap so dayjs defaults to Asia/Yangon. */
export function configureAppTimezone(tz: string = APP_TIMEZONE): void {
  if (configured) return;
  dayjs.tz.setDefault(tz);
  configured = true;
}

configureAppTimezone();
