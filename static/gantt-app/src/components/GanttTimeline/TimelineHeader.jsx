import React from 'react';
import { addDays, addMonths, addYears, addQuarters, startOfMonth, startOfWeek, startOfYear, startOfQuarter, getQuarter, format, isBefore, differenceInCalendarDays } from 'date-fns';
import { tokens, GANTT } from '../../tokens';

const isWeekend = (d) => { const day = d.getDay(); return day === 0 || day === 6; };

// Clean two-row header (prototype style):
//   days   → major: months · minor: day-of-month (centered)
//   weeks  → major: months · minor: ISO week "W##" (centered)
//   months → major: years  · minor: month name (centered)
export function TimelineHeader({ minDate, maxDate, totalDays, pixelsPerDay, zoomUnit, timelineWidth }) {
  const H = GANTT.TIMELINE_HEADER_HEIGHT;
  const majorH = 26;
  const dpx = (d) => differenceInCalendarDays(d, minDate) * pixelsPerDay;

  const major = [];
  const minor = [];

  if (zoomUnit === 'quarter') {
    let y = startOfYear(minDate);
    while (isBefore(y, maxDate)) {
      const next = addYears(y, 1);
      major.push({ x: dpx(y), label: format(y, 'yyyy') });
      y = next;
    }
    let q = startOfQuarter(minDate);
    while (isBefore(q, maxDate)) {
      const next = addQuarters(q, 1);
      minor.push({ x: dpx(q), w: dpx(next) - dpx(q), label: `Q${getQuarter(q)}` });
      q = next;
    }
  } else if (zoomUnit === 'months') {
    let y = startOfYear(minDate);
    while (isBefore(y, maxDate)) {
      const next = addYears(y, 1);
      major.push({ x: dpx(y), label: format(y, 'yyyy') });
      y = next;
    }
    let m = startOfMonth(minDate);
    while (isBefore(m, maxDate)) {
      const next = addMonths(m, 1);
      minor.push({ x: dpx(m), w: dpx(next) - dpx(m), label: format(m, 'MMM') });
      m = next;
    }
  } else if (zoomUnit === 'weeks') {
    let m = startOfMonth(minDate);
    while (isBefore(m, maxDate)) {
      const next = addMonths(m, 1);
      major.push({ x: dpx(m), label: format(m, 'MMM yyyy') });
      m = next;
    }
    let w = startOfWeek(minDate, { weekStartsOn: 1 });
    while (isBefore(w, maxDate)) {
      const next = addDays(w, 7);
      minor.push({ x: dpx(w), w: dpx(next) - dpx(w), label: `W${format(w, 'I')}` });
      w = next;
    }
  } else {
    let m = startOfMonth(minDate);
    while (isBefore(m, maxDate)) {
      const next = addMonths(m, 1);
      major.push({ x: dpx(m), label: format(m, 'MMM yyyy') });
      m = next;
    }
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(minDate, i);
      minor.push({ x: i * pixelsPerDay, w: pixelsPerDay, label: format(d, 'd'), weekend: isWeekend(d) });
    }
  }

  return (
    <g>
      {/* Major row */}
      <rect x={0} y={0} width={timelineWidth} height={majorH} fill={tokens.surfaceSunken} />
      {major.map((seg, i) => (
        <g key={`maj-${i}`}>
          {i > 0 && <line x1={seg.x} y1={0} x2={seg.x} y2={H} stroke={tokens.border} strokeWidth="1" />}
          <text x={Math.max(seg.x, 0) + 10} y={majorH - 8} fontSize="11" fontWeight="800" fill={tokens.textPrimary}>
            {seg.label}
          </text>
        </g>
      ))}

      {/* Minor row */}
      <rect x={0} y={majorH} width={timelineWidth} height={H - majorH} fill={tokens.surfaceRaised} />
      {minor.map((seg, i) => {
        const showLabel = seg.w >= 18;
        return (
          <g key={`min-${i}`}>
            {i > 0 && <line x1={seg.x} y1={majorH} x2={seg.x} y2={H} stroke={tokens.border} strokeWidth="0.5" />}
            {showLabel && (
              <text x={seg.x + seg.w / 2} y={H - 13} fontSize="10" fontWeight="600" textAnchor="middle"
                fill={seg.weekend ? tokens.textDisabled : tokens.textSubtle}>
                {seg.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Bottom border */}
      <line x1={0} y1={H} x2={timelineWidth} y2={H} stroke={tokens.border} strokeWidth="1" />
    </g>
  );
}
