import { parseISO, differenceInCalendarDays } from 'date-fns';

// Inclusive duration in days. When countWeekends is false, only business days
// (Mon–Fri) are counted — the calculation requested by the weekend toggle.
// The bar geometry stays calendar-based; this only changes the day COUNT.
export function taskDuration(startDate, endDate, countWeekends = true) {
  try {
    const s = parseISO(startDate);
    const e = parseISO(endDate);
    const total = differenceInCalendarDays(e, s) + 1;
    if (total <= 0) return 1;
    if (countWeekends) return Math.max(1, total);
    // Count business days inclusively without enumerating every day.
    const startDow = s.getDay(); // 0=Sun..6=Sat
    let biz = 0;
    const fullWeeks = Math.floor(total / 7);
    biz += fullWeeks * 5;
    const rem = total % 7;
    for (let i = 0; i < rem; i++) {
      const d = (startDow + fullWeeks * 7 + i) % 7;
      if (d !== 0 && d !== 6) biz += 1;
    }
    return Math.max(1, biz);
  } catch {
    return 1;
  }
}

// Span (earliest start → latest end) of a task list, in days, weekend-aware.
export function spanDuration(tasks, countWeekends = true) {
  let min = Infinity, max = -Infinity, minS, maxE;
  tasks.forEach(t => {
    try {
      const s = parseISO(t.startDate).getTime();
      const e = parseISO(t.endDate).getTime();
      if (s < min) { min = s; minS = t.startDate; }
      if (e > max) { max = e; maxE = t.endDate; }
    } catch { /* skip */ }
  });
  if (!isFinite(min) || !isFinite(max)) return 0;
  return taskDuration(minS, maxE, countWeekends);
}
