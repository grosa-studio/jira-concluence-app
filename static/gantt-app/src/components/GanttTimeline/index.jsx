import React, { useMemo, useRef, useEffect, useState } from 'react';
import { parseISO, differenceInCalendarDays, addDays, subDays, isWithinInterval, startOfDay, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { tokens, GANTT, phaseColor, PHASE_COLORS, lighten, STATUS_COLORS, normalizeStatus, avatarColor } from '../../tokens';
import { TimelineHeader } from './TimelineHeader';
import { TaskBar } from './TaskBar';
import { DependencyArrow } from './DependencyArrow';
import { useDrag } from '../../hooks/useDrag';

const WEEKEND_DAYS = new Set([0, 6]);
const isWeekend = (d) => WEEKEND_DAYS.has(d.getDay());

export function GanttTimeline({
  tasks, phases, collapsedPhases,
  projectStart, projectEnd,
  zoomUnit, onUpdateTask, onSelectTask, selectedTaskId,
  timelineRef, onScroll,
  users = {}, density = 'comfortable', colorScheme = 'phase', baseline = null,
}) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [hover, setHover] = useState(null); // { task, x, y }
  const todayDate = startOfDay(new Date());

  const rowH = density === 'compact' ? 40 : GANTT.ROW_HEIGHT;
  const barH = density === 'compact' ? 18 : 24;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fixed pixels-per-day per zoom level (consistent density, independent of the
  // measured container width — avoids micro/giant bars and degenerate 1st render).
  const pixelsPerDay = useMemo(() => {
    if (zoomUnit === 'quarter') return 2.4;
    if (zoomUnit === 'months')  return 4;
    if (zoomUnit === 'weeks')   return 9;
    return 26; // days
  }, [zoomUnit]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates = tasks.flatMap(t => [parseISO(t.startDate), parseISO(t.endDate)]);
    if (projectStart) dates.push(parseISO(projectStart));
    if (projectEnd) dates.push(parseISO(projectEnd));
    if (!dates.length) {
      return { minDate: subDays(todayDate, 14), maxDate: addDays(todayDate, 60), totalDays: 74 };
    }
    const pad = zoomUnit === 'quarter' ? 90 : zoomUnit === 'months' ? 60 : zoomUnit === 'weeks' ? 21 : 14;
    const min = subDays(startOfDay(new Date(Math.min(...dates))), pad);
    const max = addDays(startOfDay(new Date(Math.max(...dates))), pad * 2);
    return { minDate: min, maxDate: max, totalDays: differenceInCalendarDays(max, min) + 1 };
  }, [tasks, projectStart, projectEnd, zoomUnit, todayDate]);

  const dayToPx = (d) => differenceInCalendarDays(startOfDay(typeof d === 'string' ? parseISO(d) : d), minDate) * pixelsPerDay;
  const timelineWidth = Math.max(containerWidth, (totalDays + 30) * pixelsPerDay);

  const { dragPreview, startMove, startResize, startProgress } = useDrag({ pixelsPerDay, onUpdateTask });

  const taskMap = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t])), [tasks]);

  // Y positions for task rows
  const { rowPositions, totalContentHeight } = useMemo(() => {
    const pos = {};
    let y = GANTT.TIMELINE_HEADER_HEIGHT;
    phases.forEach(phase => {
      y += GANTT.PHASE_HEADER_HEIGHT;
      if (!collapsedPhases.has(phase.id)) {
        tasks.filter(t => t.phase === phase.id).forEach(task => {
          pos[task.id] = y;
          y += rowH;
        });
      }
    });
    return { rowPositions: pos, totalContentHeight: y };
  }, [tasks, phases, collapsedPhases, rowH]);

  const svgHeight = Math.max(totalContentHeight, 300);

  // Center on "today" on mount and whenever the zoom level (or date range) changes.
  useEffect(() => {
    if (!containerRef.current) return;
    const todayX = dayToPx(todayDate);
    containerRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 3);
  }, [zoomUnit, minDate]);

  const noStripes = zoomUnit === 'months' || zoomUnit === 'quarter';

  const weekendRects = useMemo(() => {
    if (noStripes) return null;
    const rects = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(minDate, i);
      if (isWeekend(d)) {
        rects.push(
          <rect key={i} x={i * pixelsPerDay} y={GANTT.TIMELINE_HEADER_HEIGHT} width={pixelsPerDay} height={svgHeight - GANTT.TIMELINE_HEADER_HEIGHT}
            fill={tokens.surfaceSunken} opacity="0.5" pointerEvents="none" />
        );
      }
    }
    return rects;
  }, [totalDays, pixelsPerDay, noStripes, svgHeight, minDate]);

  // Phase header stripes + rolled-up summary bars
  const phaseLayer = useMemo(() => {
    const out = [];
    let y = GANTT.TIMELINE_HEADER_HEIGHT;
    phases.forEach((phase, pIdx) => {
      const color = phaseColor(pIdx);
      out.push(
        <rect key={`ph-${phase.id}`} x={0} y={y} width={timelineWidth} height={GANTT.PHASE_HEADER_HEIGHT} fill={tokens.surfaceSunken} />,
        <rect key={`phc-${phase.id}`} x={0} y={y} width={3} height={GANTT.PHASE_HEADER_HEIGHT} fill={color} />
      );
      // Summary bar spanning the phase's task date range
      const phaseTasks = tasks.filter(t => t.phase === phase.id);
      if (phaseTasks.length) {
        const starts = phaseTasks.map(t => parseISO(t.startDate));
        const ends = phaseTasks.map(t => parseISO(t.endDate));
        const gx = dayToPx(new Date(Math.min(...starts)));
        const gx2 = dayToPx(new Date(Math.max(...ends))) + pixelsPerDay;
        const gw = Math.max(6, gx2 - gx);
        const gy = y + GANTT.PHASE_HEADER_HEIGHT / 2 - 4;
        const cap = 5;
        out.push(
          <g key={`gb-${phase.id}`} pointerEvents="none" opacity="0.9">
            <rect x={gx} y={gy} width={gw} height={8} rx={2} fill={color} />
            <polygon points={`${gx},${gy} ${gx},${gy + 8 + cap} ${gx + cap},${gy + 8}`} fill={color} />
            <polygon points={`${gx + gw},${gy} ${gx + gw},${gy + 8 + cap} ${gx + gw - cap},${gy + 8}`} fill={color} />
          </g>
        );
      }
      y += GANTT.PHASE_HEADER_HEIGHT;
      if (!collapsedPhases.has(phase.id)) {
        phaseTasks.forEach(() => { y += rowH; });
      }
    });
    return out;
  }, [tasks, phases, collapsedPhases, timelineWidth, pixelsPerDay, minDate, rowH]);

  const gridLines = useMemo(() => {
    const lines = [];
    const step = zoomUnit === 'quarter' ? 90 : zoomUnit === 'months' ? 30 : zoomUnit === 'weeks' ? 7 : 1;
    for (let i = 0; i <= totalDays; i += step) {
      const x = i * pixelsPerDay;
      lines.push(<line key={i} x1={x} y1={GANTT.TIMELINE_HEADER_HEIGHT} x2={x} y2={svgHeight} stroke={tokens.border} strokeWidth="0.5" />);
    }
    return lines;
  }, [totalDays, pixelsPerDay, zoomUnit, svgHeight]);

  const dependencyArrows = useMemo(() => {
    const arrows = [];
    tasks.forEach(task => {
      (task.dependsOn || []).forEach(predId => {
        const pred = taskMap[predId];
        if (!pred || collapsedPhases.has(pred.phase) || collapsedPhases.has(task.phase)) return;
        const fromX = dayToPx(pred.endDate) + pixelsPerDay;
        const fromY = rowPositions[predId];
        const toX = dayToPx(task.startDate);
        const toY = rowPositions[task.id];
        if (fromY === undefined || toY === undefined) return;
        const dt = task.depTypes?.[predId] || {};
        arrows.push(
          <DependencyArrow key={`${predId}->${task.id}`}
            fromX={fromX} fromY={fromY} toX={toX} toY={toY} rowH={rowH} barH={barH}
            type={dt.type || 'FS'} lag={dt.lag || 0}
            isCritical={task.isCritical && pred.isCritical} />
        );
      });
    });
    return arrows;
  }, [tasks, taskMap, rowPositions, collapsedPhases, pixelsPerDay, minDate, rowH, barH]);

  const todayX = dayToPx(todayDate);
  const showToday = isWithinInterval(todayDate, { start: minDate, end: maxDate });

  // Resolve fill + accent for a task bar
  const resolveColors = (task, pIdx) => {
    const ns = normalizeStatus(task.status);
    const colorIdx = ((pIdx % PHASE_COLORS.length) + PHASE_COLORS.length) % PHASE_COLORS.length;
    const assigneeC = colorScheme === 'assignee'
      ? (task.assigneeIds?.[0] ? avatarColor(task.assigneeIds[0]) : tokens.textSubtle)
      : null;
    let fill;
    if (ns === 'blocked') fill = 'url(#hatch-blocked)';
    else if (ns === 'atRisk' && !task.isCritical) fill = 'url(#hatch-atRisk)';
    else if (task.isCritical) fill = 'url(#grad-critical)';
    else if (colorScheme === 'assignee') fill = assigneeC;
    else if (colorScheme === 'status') fill = `url(#grad-status-${ns})`;
    else fill = `url(#grad-phase-${colorIdx})`;
    const accent = task.isCritical ? tokens.critical
      : colorScheme === 'assignee' ? assigneeC
      : colorScheme === 'status' ? STATUS_COLORS[ns].bar
      : phaseColor(pIdx);
    return { fill, accent };
  };

  const onHoverEnter = (e, task) => {
    const rect = containerRef.current.getBoundingClientRect();
    setHover({ task, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onHoverMove = (e) => {
    if (!hover) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHover(h => h && ({ ...h, x: e.clientX - rect.left, y: e.clientY - rect.top }));
  };
  const onHoverLeave = () => setHover(null);

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div
        ref={timelineRef}
        onScroll={onScroll}
        style={{ position: 'absolute', inset: 0, overflowX: 'auto', overflowY: 'auto' }}
      >
        <svg ref={svgRef} width={timelineWidth} height={svgHeight} style={{ display: 'block', userSelect: 'none' }}>
          {/* Gradient + hatch + shadow defs */}
          <defs>
            {PHASE_COLORS.map((c, i) => (
              <linearGradient key={`p${i}`} id={`grad-phase-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lighten(c, 16)} />
                <stop offset="100%" stopColor={c} />
              </linearGradient>
            ))}
            {Object.entries(STATUS_COLORS).map(([k, v]) => (
              <linearGradient key={`s${k}`} id={`grad-status-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lighten(v.bar, 16)} />
                <stop offset="100%" stopColor={v.bar} />
              </linearGradient>
            ))}
            <linearGradient id="grad-critical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tokens.criticalLight} />
              <stop offset="100%" stopColor={tokens.criticalDeep} />
            </linearGradient>
            <pattern id="hatch-blocked" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={STATUS_COLORS.blocked.bar} strokeWidth="6" />
              <line x1="3" y1="0" x2="3" y2="6" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            </pattern>
            <pattern id="hatch-atRisk" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={STATUS_COLORS.atRisk.bar} strokeWidth="6" />
              <line x1="3" y1="0" x2="3" y2="6" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            </pattern>
            <filter id="bar-shadow" x="-10%" y="-50%" width="120%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#091E42" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Backgrounds */}
          {weekendRects}
          {phaseLayer}
          {gridLines}

          <TimelineHeader
            minDate={minDate} maxDate={maxDate}
            totalDays={totalDays} pixelsPerDay={pixelsPerDay}
            zoomUnit={zoomUnit} timelineWidth={timelineWidth}
          />

          {dependencyArrows}

          {/* Baseline ghost bars */}
          {baseline && tasks.map(task => {
            const y = rowPositions[task.id];
            const snap = baseline.snapshot?.[task.id];
            if (y === undefined || !snap) return null;
            const gx = dayToPx(snap.startDate);
            const gw = Math.max(6, dayToPx(snap.endDate) - gx + pixelsPerDay);
            const gy = y + (rowH + barH) / 2 + 2;
            return <rect key={`bl-${task.id}`} x={gx} y={gy} width={gw} height={4} rx={2} fill="rgba(94,77,178,0.6)" pointerEvents="none" />;
          })}

          {tasks.map(task => {
            const y = rowPositions[task.id];
            if (y === undefined) return null;
            const x = dayToPx(task.startDate);
            const w = Math.max(8, dayToPx(task.endDate) - x + pixelsPerDay);
            const phase = phases.find(p => p.id === task.phase);
            const pIdx = phases.indexOf(phase);
            const { fill, accent } = resolveColors(task, pIdx);
            const assignees = (task.assigneeIds || []).map(id => users[id]).filter(Boolean);
            return (
              <TaskBar key={task.id}
                task={task} x={x} width={w} y={y}
                fill={fill} accent={accent} barH={barH} rowH={rowH}
                assignees={assignees}
                isCritical={task.isCritical}
                dragPreview={dragPreview}
                onStartMove={startMove}
                onStartResize={startResize}
                onStartProgress={startProgress}
                onHoverEnter={onHoverEnter}
                onHoverMove={onHoverMove}
                onHoverLeave={onHoverLeave}
              />
            );
          })}

          {/* Project boundaries */}
          {projectStart && (
            <line x1={dayToPx(projectStart)} y1={GANTT.TIMELINE_HEADER_HEIGHT} x2={dayToPx(projectStart)} y2={svgHeight}
              stroke={tokens.iconDanger} strokeWidth="2" strokeDasharray="6 3" opacity="0.6" />
          )}
          {projectEnd && (
            <line x1={dayToPx(projectEnd)} y1={GANTT.TIMELINE_HEADER_HEIGHT} x2={dayToPx(projectEnd)} y2={svgHeight}
              stroke={tokens.iconDanger} strokeWidth="2" strokeDasharray="6 3" opacity="0.6" />
          )}

          {/* Today line */}
          {showToday && (
            <g>
              <line x1={todayX} y1={GANTT.TIMELINE_HEADER_HEIGHT - 4} x2={todayX} y2={svgHeight}
                stroke={tokens.iconSuccess} strokeWidth="2" />
              <rect x={todayX - 22} y={GANTT.TIMELINE_HEADER_HEIGHT - 20} width={44} height={16} rx="4" fill={tokens.iconSuccess} />
              <text x={todayX} y={GANTT.TIMELINE_HEADER_HEIGHT - 8} fontSize="9" fontWeight="800" fill="#fff" textAnchor="middle">
                {t('status.today').toUpperCase()}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Hover tooltip (HTML overlay) */}
      {hover && (
        <BarTooltip hover={hover} users={users} phases={phases} colorScheme={colorScheme} t={t} />
      )}
    </div>
  );
}

function BarTooltip({ hover, users, phases, colorScheme, t }) {
  const { task, x, y } = hover;
  const assignees = (task.assigneeIds || []).map(id => users[id]).filter(Boolean);
  const phase = phases.find(p => p.id === task.phase);
  const stColor = STATUS_COLORS[normalizeStatus(task.status)];
  const fmt = (d) => { try { return format(parseISO(d), 'MMM d'); } catch { return d; } };
  return (
    <div style={{
      position: 'absolute', left: x + 14, top: y + 14,
      pointerEvents: 'none', zIndex: 50, maxWidth: 260,
      background: '#172B4D', color: '#fff',
      borderRadius: tokens.radius.md, boxShadow: tokens.shadow.lg,
      padding: '10px 12px', fontSize: '12px', lineHeight: 1.4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        {phase && <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>{phase.name}</span>}
        {task.isMilestone && <span style={{ fontSize: '10px', fontWeight: 800, color: tokens.iconWarning }}>◆ {t('detail.milestone')}</span>}
      </div>
      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>{task.name}</div>
      <div style={{ opacity: 0.85 }}>{fmt(task.startDate)} – {fmt(task.endDate)}</div>
      {!task.isMilestone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }}>
            <div style={{ width: `${task.progress}%`, height: '100%', borderRadius: 2, background: stColor.bar }} />
          </div>
          <span style={{ fontWeight: 700 }}>{task.progress}%</span>
        </div>
      )}
      {assignees.length > 0 && (
        <div style={{ marginTop: '6px', opacity: 0.85 }}>
          {assignees.map(a => a.displayName).join(', ')}
        </div>
      )}
    </div>
  );
}
