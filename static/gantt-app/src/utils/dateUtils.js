import { addDays, getDay, differenceInCalendarDays, parseISO, format, startOfDay } from 'date-fns';

const isWeekend = (date) => { const d = getDay(date); return d === 0 || d === 6; };

export function addBusinessDays(date, days) {
  let result = typeof date === 'string' ? parseISO(date) : new Date(date);
  const dir = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    result = addDays(result, dir);
    if (!isWeekend(result)) remaining--;
  }
  return result;
}

export function businessDaysBetween(start, end) {
  const s = startOfDay(typeof start === 'string' ? parseISO(start) : new Date(start));
  const e = startOfDay(typeof end === 'string' ? parseISO(end) : new Date(end));
  const total = differenceInCalendarDays(e, s);
  if (total < 0) return 0;
  let count = 0;
  for (let i = 0; i <= total; i++) {
    if (!isWeekend(addDays(s, i))) count++;
  }
  return count;
}

export function toDateStr(date) {
  return format(date instanceof Date ? date : parseISO(date), 'yyyy-MM-dd');
}

export function today() {
  return startOfDay(new Date());
}
