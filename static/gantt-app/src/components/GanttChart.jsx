import React, { useState, useMemo, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { format, parseISO, addDays, subDays, differenceInDays, startOfDay, getDay, isAfter, isBefore, isWithinInterval, startOfMonth, addMonths } from 'date-fns';
import './GanttChart.css';

const isWeekend = (date) => getDay(date) === 0 || getDay(date) === 6;

const addBusinessDays = (date, days) => {
  let result = new Date(date);
  let added = 0;
  let direction = days >= 0 ? 1 : -1;
  while (added < Math.abs(days)) {
    result = addDays(result, direction);
    if (!isWeekend(result)) added++;
  }
  return result;
};

const getBusinessDaysDiff = (start, end) => {
  if (isAfter(start, end)) return 0;
  let count = 0;
  let current = startOfDay(start);
  const finish = startOfDay(end);
  while (isBefore(current, finish) || current.getTime() === finish.getTime()) {
    if (!isWeekend(current)) count++;
    current = addDays(current, 1);
  }
  return count;
};

const ROW_HEIGHT = 52;
const GROUP_HEADER_HEIGHT = 44;
const LABEL_WIDTH = 340;

const GanttChart = forwardRef(({ 
  tasks, 
  phases, 
  chartHeight, 
  projectStart, 
  projectEnd, 
  zoomScale = 1.0, 
  zoomUnit = 'weeks',
  onUpdateTask, 
  onDeleteTask, 
  onAddTask, 
  onMoveTask,
  onMovePhase,
  onUpdateHeight,
  isReloading
}, ref) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const today = startOfDay(new Date());

  const pixelsPerDay = useMemo(() => {
    const base = (containerWidth - LABEL_WIDTH);
    if (zoomUnit === 'weeks') return (base / 90) * zoomScale; 
    if (zoomUnit === 'months') return (base / 180) * zoomScale;
    return (base / 20) * zoomScale;
  }, [zoomUnit, zoomScale, containerWidth]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    let min, max;
    if (!tasks || !tasks.length) {
      min = projectStart ? startOfDay(parseISO(projectStart)) : subDays(today, 5);
      max = projectEnd ? startOfDay(parseISO(projectEnd)) : addDays(today, 30);
    } else {
      const dates = tasks.flatMap(t => [parseISO(t.startDate), parseISO(t.endDate)]);
      if (projectStart) dates.push(parseISO(projectStart));
      if (projectEnd) dates.push(parseISO(projectEnd));
      min = startOfDay(new Date(Math.min(...dates)));
      max = startOfDay(new Date(Math.max(...dates)));
    }
    const pad = zoomUnit === 'months' ? 60 : (zoomUnit === 'weeks' ? 21 : 14);
    min = subDays(min, pad);
    max = addDays(max, pad * 2);
    return { minDate: min, maxDate: max, totalDays: differenceInDays(max, min) + 1 };
  }, [tasks, projectStart, projectEnd, today, zoomUnit]);

  const groups = useMemo(() => phases.map(p => ({
    name: p,
    tasks: tasks.filter(t => t.phase === p)
  })), [phases, tasks]);

  const timelineWidth = (totalDays + 45) * pixelsPerDay;
  const dayToPx = (date) => differenceInDays(startOfDay(typeof date === 'string' ? parseISO(date) : date), minDate) * pixelsPerDay;

  useImperativeHandle(ref, () => ({
    exportToPng: async () => {
      if (!svgRef.current) return;
      const svg = svgRef.current;
      const serializer = new XMLSerializer();
      
      const styleStr = `
        text { font-family: 'Inter', sans-serif; }
        .timeline-label { font-weight: 900; }
        .task-bar { fill-opacity: 0.1; }
      `;
      const styleTag = `<style>${styleStr}</style>`;
      
      let source = serializer.serializeToString(svg);
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      source = source.replace('</svg>', `${styleTag}</svg>`);

      const img = new Image();
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.width.baseVal.value;
        canvas.height = svg.height.baseVal.value;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `Gantt-Intelligence-${format(new Date(), 'yyyy-MM-dd')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  }));

  const togglePhase = (phase) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      const scrollTarget = dayToPx(today) - 100;
      containerRef.current.scrollLeft = Math.max(0, scrollTarget);
      setIsInitialized(true);
    }
  }, [isInitialized, today, minDate, pixelsPerDay]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const navRef = useRef({ isPanning: false, startX: 0, initialScroll: 0 });
  const panFrameRef = useRef();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMouseDown = (e) => {
      if (e.target.classList.contains('pan-layer') || e.target.tagName === 'svg') {
        navRef.current = { isPanning: true, startX: e.clientX, initialScroll: el.scrollLeft };
        el.style.cursor = 'grabbing';
      }
    };
    const onMouseMove = (e) => {
      if (!navRef.current.isPanning) return;
      const dx = e.clientX - navRef.current.startX;
      if (panFrameRef.current) cancelAnimationFrame(panFrameRef.current);
      panFrameRef.current = requestAnimationFrame(() => { el.scrollLeft = navRef.current.initialScroll - dx; });
    };
    const onMouseUp = () => { navRef.current.isPanning = false; el.style.cursor = 'grab'; };
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const [dragPreview, setDragPreview] = useState(null); // id, dx, type

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState || dragState.type === 'pan') return;
      e.preventDefault();
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (dragState.type === 'height') {
        onUpdateHeight(Math.max(200, dragState.initialHeight + dy));
      } else {
        // High-fps Preview update
        setDragPreview({ id: dragState.id, type: dragState.type, dx });
      }
    };

    const handleMouseUp = () => {
      if (dragPreview) {
        const daysDx = Math.round(dragPreview.dx / pixelsPerDay);
        
        if (dragPreview.type === 'move') {
          const newStart = addBusinessDays(parseISO(dragState.initialStart), daysDx);
          const newEnd = addBusinessDays(parseISO(dragState.initialEnd), daysDx);
          onUpdateTask(dragPreview.id, { startDate: format(newStart, 'yyyy-MM-dd'), endDate: format(newEnd, 'yyyy-MM-dd') });
        } else if (dragPreview.type === 'resize') {
          const newEnd = addBusinessDays(parseISO(dragState.initialEnd), daysDx);
          const businessDays = getBusinessDaysDiff(parseISO(dragState.initialStart), newEnd);
          onUpdateTask(dragPreview.id, { endDate: format(newEnd, 'yyyy-MM-dd'), hours: businessDays * 8 });
        } else if (dragPreview.type === 'progress') {
          const progressDx = (dragPreview.dx / dragState.barWidth) * 100;
          onUpdateTask(dragPreview.id, { progress: Math.min(100, Math.max(0, Math.round(dragState.initialProgress + progressDx))) });
        }
      }
      setDragState(null);
      setDragPreview(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, dragPreview, pixelsPerDay, onUpdateTask, onUpdateHeight]);

  const renderTimelineHeader = () => {
    const months = [];
    const years = [];
    let yearCurr = startOfMonth(minDate);
    while (isBefore(yearCurr, maxDate) || yearCurr.getTime() === maxDate.getTime()) {
      const yr = format(yearCurr, 'yyyy');
      if (!years.find(y => y.label === yr)) {
        years.push({ label: yr, x: dayToPx(yearCurr) });
      }
      yearCurr = addMonths(yearCurr, 1);
    }

    let step = zoomUnit === 'weeks' ? 7 : (zoomUnit === 'months' ? 30 : 1);
    if (zoomUnit === 'months') {
       let curr = startOfMonth(minDate);
       while (isBefore(curr, maxDate) || curr.getTime() === maxDate.getTime()) {
         const x = dayToPx(curr);
         months.push(
           <g key={curr.getTime()} transform={`translate(${x}, 30)`}>
              <line x1="0" y1="-30" x2="0" y2="60" stroke="#DFE1E6" strokeWidth="0.5" />
              <text x={8} y={35} fontSize="11" fontWeight="900" fill="#172B4D" transform="rotate(-35, 8, 35)">
                {format(curr, 'MMMM').toUpperCase()}
              </text>
           </g>
         );
         curr = addMonths(curr, 1);
       }
    } else {
       for (let i = 0; i <= totalDays; i += step) {
         const d = addDays(minDate, i);
         const x = i * pixelsPerDay;
         let txt = zoomUnit === 'weeks' ? `W${format(d, 'w')} (${format(d, 'MMM')})` : format(d, 'MMM dd');
         months.push(
           <g key={i} transform={`translate(${x}, 30)`}>
              <line x1="0" y1="-30" x2="0" y2="60" stroke="#DFE1E6" strokeWidth="0.5" />
              <text x={5} y={35} fontSize="10" fontWeight="800" fill={isWeekend(d) ? '#A5ADBA' : '#42526E'} transform="rotate(-40, 5, 35)">
                {txt}
              </text>
           </g>
         );
       }
    }

    return (
      <g>
        {years.map(y => (
          <g key={y.label} transform={`translate(${y.x}, 0)`}>
            <rect width={timelineWidth} height="30" fill="#F4F5F7" />
            <text x="12" y="20" fontSize="11" fontWeight="900" fill="#0052CC" style={{ letterSpacing: '1px' }}>{y.label}</text>
            <line x1="0" y1="0" x2="0" y2="30" stroke="#C1C7D0" strokeWidth="1" />
          </g>
        ))}
        {months}
      </g>
    );
  };

  const renderWeekends = (height) => {
    if (zoomUnit === 'months') return null;
    const rects = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(minDate, i);
      if (isWeekend(d)) {
        rects.push(<rect key={i} x={i * pixelsPerDay} y="0" width={pixelsPerDay} height={height} fill="#F4F5F7" fillOpacity="0.4" pointerEvents="none" />);
      }
    }
    return rects;
  };

  return (
    <div className="gantt-wrapper">
      <div ref={containerRef} className="gantt-container">
        <div className="gantt-sidebar">
          <div className="gantt-sidebar-header">
            <div style={{ flexGrow: 1 }}>
              <span style={{ fontSize: '10px', fontWeight: '900', color: '#6B778C', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Workstream / Intelligence</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', color: '#6B778C', textTransform: 'uppercase', letterSpacing: '1.2px', marginRight: '32px' }}>Estimate</span>
            </div>
          </div>
          
          {groups.map((group, gIdx) => {
            const isCollapsed = collapsedPhases.has(group.name);
            return (
              <React.Fragment key={`sidebar-group-${gIdx}`}>
                <div className="gantt-sidebar-phase" onClick={() => togglePhase(group.name)} style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: '12px', marginRight: '8px' }}>{isCollapsed ? '▶' : '▼'}</span>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: '#172B4D', flexGrow: 1 }}>{group.name.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    <span onClick={() => onMovePhase(group.name, 'up')} style={{ cursor: 'pointer', color: '#4C9AFF', fontWeight: 'bold' }}>↑</span>
                    <span onClick={() => onMovePhase(group.name, 'down')} style={{ cursor: 'pointer', color: '#4C9AFF', fontWeight: 'bold' }}>↓</span>
                    <button onClick={() => onAddTask(group.name)} style={{ background: '#36B37E', border: 'none', color: 'white', borderRadius: '4px', width: '20px', height: '20px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                  </div>
                </div>
                
                {!isCollapsed && group.tasks.map(task => (
                  <div key={`sidebar-task-${task.id}`} className="gantt-sidebar-row">
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      {editing?.id === task.id && editing?.field === 'name' ? (
                        <input autoFocus className="elite-input" value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })} 
                               onBlur={() => { onUpdateTask(task.id, { name: editing.value }); setEditing(null); }}
                               onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null); }} />
                      ) : (
                        <div style={{ fontSize: '13px', color: '#172B4D', fontWeight: '600', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                             onClick={() => setEditing({ id: task.id, field: 'name', value: task.name })}>
                          {task.name}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px' }}>
                      <span 
                        onClick={() => onUpdateTask(task.id, { isMilestone: !task.isMilestone })} 
                        style={{ cursor: 'pointer', color: task.isMilestone ? '#FFAB00' : '#A5ADBA', fontSize: '14px', fontWeight: 'bold' }}
                        title="Toggle Milestone"
                      >◆</span>
                      <span onClick={() => onMoveTask(task.id, 'up')} style={{ cursor: 'pointer', color: '#4C9AFF', fontSize: '12px' }}>↑</span>
                      <span onClick={() => onMoveTask(task.id, 'down')} style={{ cursor: 'pointer', color: '#4C9AFF', fontSize: '12px' }}>↓</span>
                      <span onClick={() => onDeleteTask(task.id)} style={{ cursor: 'pointer', color: '#FF5630', fontSize: '12px', marginRight: '8px' }}>✕</span>
                      
                      <div style={{ textAlign: 'right', minWidth: '60px' }}>
                        {editing?.id === task.id && editing?.field === 'hours' ? (
                          <input type="number" autoFocus className="elite-input" style={{ width: '50px' }} value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })}
                                 onBlur={() => { const h = parseFloat(editing.value) || 8; const newEnd = addBusinessDays(parseISO(task.startDate), (h/8) - 1); onUpdateTask(task.id, { hours: h, endDate: format(newEnd, 'yyyy-MM-dd') }); setEditing(null); }}
                                 onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null); }} />
                        ) : (
                          <div style={{ fontSize: '11px', color: '#172B4D', fontWeight: '800', cursor: 'text' }} onClick={() => setEditing({ id: task.id, field: 'hours', value: task.hours })}>
                            {task.hours}h <span style={{ color: '#6B778C', fontWeight: '400' }}>({task.hours/8}d)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>

        <div className="gantt-timeline-container" style={{ minWidth: timelineWidth }}>
          <svg ref={svgRef} width={timelineWidth} height={chartHeight} style={{ display: 'block' }}>
            <rect className="pan-layer" width={timelineWidth} height={chartHeight} fill="transparent" style={{ cursor: 'grab' }} />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4C9AFF" />
                <stop offset="100%" stopColor="#0052CC" />
              </linearGradient>
            </defs>

            {renderWeekends(chartHeight)}
            
            {Array.from({ length: totalDays + 1 }).map((_, i) => (
              <line key={i} x1={i * pixelsPerDay} y1="0" x2={i * pixelsPerDay} y2={chartHeight} stroke="#EBECF0" strokeWidth="0.5" />
            ))}
            
            <rect width={timelineWidth} height="90" fill="#F4F5F7" opacity="0.9" />
            {renderTimelineHeader()}

            {(() => {
              let y = 90;
              const bars = [];
              groups.forEach(group => {
                const isCollapsed = collapsedPhases.has(group.name);
                y += GROUP_HEADER_HEIGHT;
                if (!isCollapsed) {
                  group.tasks.forEach(task => {
                    const startX = dayToPx(task.startDate);
                    const endX = dayToPx(task.endDate);
                    const initialBarWidth = Math.max(12, endX - startX + (zoomUnit === 'days' ? pixelsPerDay : pixelsPerDay * 3));
                    
                    const isDragging = dragPreview?.id === task.id;
                    let currentX = startX;
                    let currentWidth = initialBarWidth;
                    let currentProgress = task.progress;

                    if (isDragging) {
                      if (dragPreview.type === 'move') currentX += dragPreview.dx;
                      if (dragPreview.type === 'resize') currentWidth = Math.max(12, initialBarWidth + dragPreview.dx);
                      if (dragPreview.type === 'progress') {
                        const progressDx = (dragPreview.dx / initialBarWidth) * 100;
                        currentProgress = Math.min(100, Math.max(0, Math.round(task.progress + progressDx)));
                      }
                    }

                    bars.push(
                      <g key={`bar-${task.id}`} transform={`translate(${currentX}, ${y + 14})`} style={{ transition: dragState ? 'none' : 'transform 0.2s' }}>
                        {/* Ghost Bar (Original Position) */}
                        {isDragging && dragPreview.type !== 'progress' && (
                          <rect 
                            x={startX - currentX} 
                            width={initialBarWidth} 
                            height="24" 
                            rx="8" 
                            fill="#0052CC" 
                            fillOpacity="0.03" 
                            stroke="#0052CC" 
                            strokeWidth="1" 
                            strokeDasharray="4 2" 
                          />
                        )}

                        {/* Active Task Bar */}
                        <g opacity={isDragging ? 0.7 : 1}>
                          <rect width={currentWidth} height="24" rx="8" fill="#0052CC" fillOpacity="0.08" stroke="#0052CC" strokeWidth="1.5" className="task-bar" 
                                style={{ cursor: 'move' }}
                                onMouseDown={(e) => setDragState({ type: 'move', id: task.id, startX: e.clientX, initialStart: task.startDate, initialEnd: task.endDate })} />
                          <rect width={(currentWidth * currentProgress) / 100} height="24" rx="8" fill="url(#barGradient)" stroke="#0052CC" strokeWidth="1" />
                          <rect x={currentWidth - 10} y="0" width="10" height="24" className="resize-handle" cursor="ew-resize"
                                onMouseDown={(e) => { e.stopPropagation(); setDragState({ type: 'resize', id: task.id, startX: e.clientX, initialStart: task.startDate, initialEnd: task.endDate }); }} />
                          <circle cx={(currentWidth * currentProgress) / 100} cy="12" r="6" className="progress-handle" cursor="pointer"
                                  onMouseDown={(e) => { e.stopPropagation(); setDragState({ type: 'progress', id: task.id, initialProgress: task.progress, startX: e.clientX, barWidth: currentWidth }); }} />
                          <text x={currentWidth + 24} y="17" fontSize="10" fill="#172B4D" fontWeight="900" opacity={task.isMilestone ? 0.6 : 1}>{currentProgress}%</text>
                        </g>

                        {/* Milestone Delivery Marker (Diamond) */}
                        {task.isMilestone && (
                          <path 
                            d="M 0 8 L 8 0 L 16 8 L 8 16 Z" 
                            fill="#FFAB00" 
                            stroke="#E67E22" 
                            strokeWidth="1.5"
                            transform={`translate(${currentWidth - 4}, 4)`}
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                          />
                        )}

                        {/* Skeleton Sync Pulse */}
                        {isReloading && (
                          <rect 
                            width={currentWidth} 
                            height="24" 
                            rx="8" 
                            fill="#EBECF0" 
                            className="skeleton-pulse" 
                            pointerEvents="none" 
                          />
                        )}
                      </g>
                    );
                    y += ROW_HEIGHT;
                  });
                }
              });
              return bars;
            })()}

            {projectStart && <line x1={dayToPx(projectStart)} y1="90" x2={dayToPx(projectStart)} y2={chartHeight} stroke="#FF5630" strokeWidth="3" strokeDasharray="8,4" />}
            {projectEnd && <line x1={dayToPx(projectEnd)} y1="90" x2={dayToPx(projectEnd)} y2={chartHeight} stroke="#FF5630" strokeWidth="3" strokeDasharray="8,4" />}
            {isWithinInterval(today, { start: minDate, end: maxDate }) && (
              <g>
                <line x1={dayToPx(today)} y1="80" x2={dayToPx(today)} y2={chartHeight} stroke="#36B37E" strokeWidth="2.5" />
                <rect x={dayToPx(today) - 28} y="74" width="56" height="18" rx="6" fill="#36B37E" />
                <text x={dayToPx(today)} y="87" fontSize="9" fill="white" fontWeight="900" textAnchor="middle">TODAY</text>
              </g>
            )}
          </svg>
        </div>
      </div>
      
      <div onMouseDown={(e) => setDragState({ type: 'height', startY: e.clientY, initialHeight: chartHeight })}
           style={{ height: '14px', cursor: 'ns-resize', background: '#EBECF0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '48px', height: '4px', background: '#C1C7D0', borderRadius: '2px' }} />
      </div>
    </div>
  );
});

export default GanttChart;
