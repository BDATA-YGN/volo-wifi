import dayjs from 'dayjs';
import isBetweenPlugin from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(isBetweenPlugin);
dayjs.extend(customParseFormat);

export function getCurrentDate(): Date {
  return new Date();
}

enum TimeUnit {
  MILLISECOND = 'ms',
  SECOND = 's',
  MINUTE = 'm',
  HOUR = 'h',
  DAY = 'd',
}

function destructTimeString(timeString: string): { number: number; unit: TimeUnit } {
  const normalized = timeString.trim().toLowerCase();
  const regex = new RegExp(`^(\\d+)(${Object.values(TimeUnit).join('|')})$`);
  const matches = normalized.match(regex);

  if (!matches) {
    throw new Error(`Invalid time string: ${timeString} (use e.g. 15m, 24h, 7d)`);
  }

  const number = parseInt(matches[1]);
  const unit = matches[2] as TimeUnit;

  return {
    number,
    unit,
  };
}


export function convertToMilliSeconds(timeString: string): number {
  const multiplier = {
    [TimeUnit.MILLISECOND]: 1,
    [TimeUnit.SECOND]: 1000,
    [TimeUnit.MINUTE]: 60_000,
    [TimeUnit.HOUR]: 3_600_000,
    [TimeUnit.DAY]: 86_400_000,
  };

  const { number, unit } = destructTimeString(timeString);
  return number * multiplier[unit];
}

export function subtract(date: Date, value: number, unit: dayjs.ManipulateType): Date {
  return dayjs(date).subtract(value, unit).toDate();
}

export function add(date: Date, value: number, unit: dayjs.ManipulateType): Date {
  return dayjs(date).add(value, unit).toDate();
}

export function isAfter(date1: Date, date2: Date, unit?: dayjs.OpUnitType): boolean {
  return dayjs(date1).isAfter(dayjs(date2), unit);
}

export function diff(date1: Date, date2: Date, unit: dayjs.QUnitType | dayjs.OpUnitType): number {
  return dayjs(date1).diff(dayjs(date2), unit);
}

export function isWeekend(date: Date) {
  const weekendDays = ['Sunday', 'Saturday'];
  const day = dayjs(date).format('dddd');
  return weekendDays.includes(day);
}

export function isBetween(date: Date, start_date: Date, end_date: Date, unit: dayjs.OpUnitType) {
  return dayjs(date).isBetween(start_date, end_date, unit);
}

export function parse(parseValue: dayjs.ConfigType, format: dayjs.OptionType) {
  return dayjs(parseValue, format).toDate();
}

export function isSame(date1: Date, date2: Date, unit: dayjs.OpUnitType) {
  return dayjs(date1).isSame(date2, unit);
}

export function format(date: Date, template: string) {
  return dayjs(date).format(template);
}
