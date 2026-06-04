import React, { useMemo, useRef, useEffect, useState } from 'react';
import { parseISO, differenceInCalendarDays, addDays, subDays, startOfMonth, addMonths, isBefore, isWithinInterval, startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { tokens, GANTT, phaseColor } from '../../tokens';
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
}) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const todayDate = startOfDay(new Date());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pixelsPerDay = useMemo(() => {
    const base = containerWidth;
    if (zoomUnit === 'weeks')  return base / 90;
    if (zoomUnit === 'months') return base / 180;
    return base / 20;
  }, [zoomUnit, containerWidth]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates = tasks.flatMap(t => [parseISO(t.startDate), parseISO(t.endDate)]);
    if (projectStart) dates.push(parseISO(projectStart));
    if (projectEnd) dates.push(parseISO(projectEnd));
    if (!dates.length) {
      return { minDate: subDays(todayDate, 14), maxDate: addDays(todayDate, 60), totalDays: 74 };
    }
    const pad = zoomUnit === 'months' ? 60 : zoomUnit === 'weeks' ? 21 : 14;
    const min = subDays(startOfDay(new Date(Math.min(...dates))), pad);
    const max = addDays(startOfDay(new Date(Math.max(...dates))), pad * 2);
    return { minDate: min, maxDate: max, totalDays: differenceInCalendarDays(max, min) + 1 };
  }, [tasks, projectStart, projectEnd, zoomUnit, todayDate]);

  const dayToPx = (d) => differenceInCalendarDays(startOfDay(typeof d === 'string' ? parseISO(d) : d), minDate) * pixelsPerDay;
  const timelineWidth = Math.max(containerWidth, (totalDays + 30) * pixelsPerDay);

  const { dragPreview, startMove, startResize, startProgress } = useDrag({ pixelsPerDay, onUpdateTask });

  // Build task index for dependency arrows
  const taskMap = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t])), [tasks]);

  // Calculate y positions
  const { rowPositions, totalContentHeight } = useMemo(() => {
    const pos = {};
    let y = GANTT.TIMELINE_HEADER_HEIGHT;
    phases.forEach(phase => {
      y += GANTT.PHASE_HEADER_HEIGHT;
      if (!collapsedPhases.has(phase.id)) {
        tasks.filter(t => t.phase === phase.id).forEach(task => {
          pos[task.id] = y;
          y += GANTT.ROW_HEIGHT;
        });
      }
    });
    return { rowPositions: pos, totalContentHeight: y };
  }, [tasks, phases, collapsedPhases]);

  const svgHeight = Math.max(totalContentHeight, 300);

  // Auto-scroll to today on first load
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (scrolledRef.current || !containerRef.current) return;
    const todayX = dayToPx(todayDate);
    containerRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 3);
    scrolledRef.current = true;
  }, [pixelsPerDay]);

  const weekendRects = useMemo(() => {
    if (zoomUnit === 'months') return null;
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
  }, [totalDays, pixelsPerDay, zoomUnit, svgHeight, minDate]);

  const phaseStripes = useMemo(() => {
    const stripes = [];
    let y = GANTT.TIMELINE_HEADER_HEIGHT;
    phases.forEach((phase, pIdx) => {
      const color = phaseColor(pIdx);
      // Phase header stripe
      stripes.push(
        <rect key={`ph-${phase.id}`} x={0} y={y} width={timelineWidth} height={GANTT.PHASE_HEADER_HEIGHT}
          fill={tokens.surfaceSunken} />
      );
      stripes.push(
        <rect key={`phc-${phase.id}`} x={0} y={y} width={3} height={GANTT.PHASE_HEADER_HEIGHT}
          fill={color} />
      );
      y += GANTT.PHASE_HEADER_HEIGHT;
      if (!collapsedPhases.has(phase.id)) {
        tasks.filter(t => t.phase === phase.id).forEach(task => {
          y += GANTT.ROW_HEIGHT;
        });
      }
    });
    return stripes;
  }, [tasks, phases, collapsedPhases, timelineWidth]);

  const gridLines = useMemo(() => {
    const lines = [];
    const step = zoomUnit === 'months' ? 30 : zoomUnit === 'weeks' ? 7 : 1;
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
        arrows.push(
          <DependencyArrow key={`${predId}->${task.id}`}
            fromX={fromX} fromY={fromY} toX={toX} toY={toY}
            isCritical={task.isCritical && pred.isCritical} />
        );
      });
    });
    return arrows;
  }, [tasks, taskMap, rowPositions, collapsedPhases, pixelsPerDay]);

  const todayX = dayToPx(todayDate);
  const showToday = isWithinInterval(todayDate, { start: minDate, end: maxDate });

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div
        ref={timelineRef}
        onScroll={onScroll}
        style={{ position: 'absolute', inset: 0, overflowX: 'auto', overflowY: 'auto' }}
      >
        <svg
          ref={svgRef}
          width={timelineWidth}
          height={svgHeight}
          style={{ display: 'block', userSelect: 'none' }}
        >
          {/* Backgrounds */}
          {weekendRects}
          {phaseStripes}
          {gridLines}

          {/* Timeline header */}
          <TimelineHeader
            minDate={minDate} maxDate={maxDate}
            totalDays={totalDays} pixelsPerDay={pixelsPerDay}
            zoomUnit={zoomUnit} timelineWidth={timelineWidth}
          />

          {/* Dependency arrows (behind bars) */}
          {dependencyArrows}

          {/* Task bars */}
          {tasks.map(task => {
            const y = rowPositions[task.id];
            if (y === undefined) return null;
            const x = dayToPx(task.startDate);
            const w = Math.max(8, dayToPx(task.endDate) - x + pixelsPerDay);
            const phase = phases.find(p => p.id === task.phase);
            const pIdx = phases.indexOf(phase);
            const color = phaseColor(pIdx);
            return (
              <TaskBar key={task.id}
                task={task} x={x} width={w} y={y} color={color}
                isCritical={task.isCritical}
                dragPreview={dragPreview}
                onStartMove={startMove}
                onStartResize={startResize}
                onStartProgress={startProgress}
              />
            );
          })}

          {/* Project boundaries */}
          {projectStart && (
            <line x1={dayToPx(projectStart)} y1={GANTT.TIMELINE_HEADER_HEIGHT}
              x2={dayToPx(projectStart)} y2={svgHeight}
              stroke={tokens.iconDanger} strokeWidth="2" strokeDasharray="6 3" opacity="0.6" />
          )}
          {projectEnd && (
            <line x1={dayToPx(projectEnd)} y1={GANTT.TIMELINE_HEADER_HEIGHT}
              x2={dayToPx(projectEnd)} y2={svgHeight}
              stroke={tokens.iconDanger} strokeWidth="2" strokeDasharray="6 3" opacity="0.6" />
          )}

          {/* Today line */}
          {showToday && (
            <g>
              <line x1={todayX} y1={GANTT.TIMELINE_HEADER_HEIGHT - 4} x2={todayX} y2={svgHeight}
                stroke={tokens.iconSuccess} strokeWidth="2" />
              <rect x={todayX - 22} y={GANTT.TIMELINE_HEADER_HEIGHT - 20} width={44} height={16} rx="4"
                fill={tokens.iconSuccess} />
              <text x={todayX} y={GANTT.TIMELINE_HEADER_HEIGHT - 8} fontSize="9" fontWeight="800"
                fill="#fff" textAnchor="middle">
                {t('status.today').toUpperCase()}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
