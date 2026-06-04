import React from 'react';
import { addDays, addMonths, startOfMonth, format, isBefore } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { tokens, GANTT } from '../../tokens';

const isWeekend = (d) => { const day = d.getDay(); return day === 0 || day === 6; };

export function TimelineHeader({ minDate, maxDate, totalDays, pixelsPerDay, zoomUnit, timelineWidth }) {
  const { t } = useTranslation();
  const H = GANTT.TIMELINE_HEADER_HEIGHT;
  const yearH = 24;
  const unitH = H - yearH;

  const years = [];
  let yCurr = startOfMonth(minDate);
  while (isBefore(yCurr, maxDate)) {
    const yr = format(yCurr, 'yyyy');
    if (!years.find(y => y.label === yr)) {
      years.push({ label: yr, x: differenceInDaysPx(yCurr, minDate, pixelsPerDay) });
    }
    yCurr = addMonths(yCurr, 1);
  }

  const units = [];
  if (zoomUnit === 'months') {
    let curr = startOfMonth(minDate);
    while (isBefore(curr, maxDate)) {
      const x = differenceInDaysPx(curr, minDate, pixelsPerDay);
      units.push(
        <g key={curr.getTime()}>
          <line x1={x} y1={yearH} x2={x} y2={H} stroke={tokens.border} strokeWidth="0.5" />
          <text x={x + 8} y={H - 6} fontSize="11" fontWeight="700" fill={tokens.textSubtle}>
            {format(curr, 'MMMM').toUpperCase()}
          </text>
        </g>
      );
      curr = addMonths(curr, 1);
    }
  } else {
    const step = zoomUnit === 'weeks' ? 7 : 1;
    for (let i = 0; i <= totalDays; i += step) {
      const d = addDays(minDate, i);
      const x = i * pixelsPerDay;
      const label = zoomUnit === 'weeks'
        ? `W${format(d, 'w')} · ${format(d, 'MMM d')}`
        : format(d, 'MMM d');
      const isWk = isWeekend(d);
      units.push(
        <g key={i}>
          <line x1={x} y1={yearH} x2={x} y2={H} stroke={tokens.border} strokeWidth="0.5" />
          <text x={x + 4} y={H - 5} fontSize="10" fontWeight="700"
            fill={isWk ? tokens.textDisabled : tokens.textSubtle}
            transform={`rotate(-35, ${x + 4}, ${H - 5})`}>
            {label}
          </text>
        </g>
      );
    }
  }

  return (
    <g>
      {/* Year row background */}
      <rect x={0} y={0} width={timelineWidth} height={yearH} fill={tokens.surfaceSunken} />
      {years.map(y => (
        <g key={y.label}>
          <line x1={y.x} y1={0} x2={y.x} y2={yearH} stroke={tokens.borderBold} strokeWidth="1" />
          <text x={y.x + 8} y={yearH - 6} fontSize="11" fontWeight="800" fill="var(--ds-text-brand, #0052CC)">
            {y.label}
          </text>
        </g>
      ))}
      {/* Unit row background */}
      <rect x={0} y={yearH} width={timelineWidth} height={unitH} fill={tokens.surfaceRaised} />
      {units}
      {/* Bottom border */}
      <line x1={0} y1={H} x2={timelineWidth} y2={H} stroke={tokens.border} strokeWidth="1" />
    </g>
  );
}

function differenceInDaysPx(date, minDate, pixelsPerDay) {
  const diff = Math.round((date - minDate) / 86400000);
  return diff * pixelsPerDay;
}
