import React, { useRef, useState, useEffect, useMemo } from 'react';
import { differenceInDays, parseISO, addDays, subDays, startOfDay, format, isWithinInterval } from 'date-fns';

const GanttChart = ({ tasks }) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800); // Default fallback

  // Parse tasks and find date boundaries
  const parsedTasks = useMemo(() => {
    return tasks.map(t => ({
      ...t,
      parsedStart: startOfDay(parseISO(t.startDate)),
      parsedEnd: startOfDay(parseISO(t.endDate)),
      progress: Number(t.progress) || 0
    }));
  }, [tasks]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (!parsedTasks.length) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };
    
    let min = parsedTasks[0].parsedStart;
    let max = parsedTasks[0].parsedEnd;

    parsedTasks.forEach(t => {
      if (t.parsedStart < min) min = t.parsedStart;
      if (t.parsedEnd > max) max = t.parsedEnd;
    });

    // Add some padding to start and end
    min = subDays(min, 2);
    max = addDays(max, 5);

    return {
      minDate: min,
      maxDate: max,
      totalDays: differenceInDays(max, min)
    };
  }, [parsedTasks]);

  // Responsive Scaling Logic
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        // Leave room for task labels (e.g., 200px)
        const availableTimelineWidth = entries[0].contentRect.width - 250; 
        setContainerWidth(Math.max(400, availableTimelineWidth)); // Minimum width fallback
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const pixelsPerDay = containerWidth / totalDays;

  // Render helpers
  const getTaskStyles = (task) => {
    const leftOffsetDays = differenceInDays(task.parsedStart, minDate);
    const durationDays = differenceInDays(task.parsedEnd, task.parsedStart) + 1; // +1 to include end day

    return {
      left: `${leftOffsetDays * pixelsPerDay}px`,
      width: `${durationDays * pixelsPerDay}px`
    };
  };

  const today = startOfDay(new Date());
  const showToday = isWithinInterval(today, { start: minDate, end: maxDate });
  const todayOffset = showToday ? differenceInDays(today, minDate) * pixelsPerDay : null;

  return (
    <div className="gantt-wrapper" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <h2>Project Timeline</h2>
      
      <div className="gantt-chart-container" style={{ display: 'flex', border: '1px solid var(--gantt-border)', borderRadius: '4px' }}>
        
        {/* Left Column: Task Labels */}
        <div className="gantt-labels" style={{ width: '250px', borderRight: '1px solid var(--gantt-border)', flexShrink: 0 }}>
          <div className="gantt-header-cell" style={{ height: '40px', borderBottom: '1px solid var(--gantt-border)', padding: '8px 12px', fontWeight: 'bold' }}>
            Task Name
          </div>
          {parsedTasks.map((task, i) => (
            <div key={task.id || i} className="gantt-label-cell" style={{ height: '40px', padding: '0 12px', display: 'flex', alignItems: 'center', borderBottom: i === parsedTasks.length - 1 ? 'none' : '1px solid var(--gantt-border)' }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.name}</span>
            </div>
          ))}
        </div>

        {/* Right Column: Timeline */}
        <div className="gantt-timeline" style={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
          
          {/* Header (Months/Time scale) - simplified for MVP */}
          <div className="gantt-timeline-header" style={{ height: '40px', borderBottom: '1px solid var(--gantt-border)', display: 'flex', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, padding: '8px', fontSize: '12px', color: 'var(--gantt-text-subtle)' }}>
              {format(minDate, 'MMM d, yyyy')}
            </div>
            <div style={{ position: 'absolute', right: 0, padding: '8px', fontSize: '12px', color: 'var(--gantt-text-subtle)' }}>
              {format(maxDate, 'MMM d, yyyy')}
            </div>
          </div>

          {/* Grid lines (optional MVP simplification: just today marker) */}
          <div className="gantt-timeline-body" style={{ position: 'relative', height: `${parsedTasks.length * 40}px` }}>
            {showToday && (
              <div 
                className="today-marker" 
                style={{
                  position: 'absolute',
                  left: `${todayOffset}px`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: 'var(--today-line)',
                  zIndex: 0
                }}
                title="Today"
              />
            )}

            {/* Task Bars */}
            {parsedTasks.map((task, i) => {
              const styles = getTaskStyles(task);
              return (
                <div key={task.id || i} className="gantt-row" style={{ position: 'absolute', top: `${i * 40}px`, height: '40px', width: '100%', borderBottom: i === parsedTasks.length - 1 ? 'none' : '1px dashed #ebecf0' }}>
                  <div 
                    className="task-bar-container"
                    style={{
                      position: 'absolute',
                      left: styles.left,
                      width: styles.width,
                      top: '8px',
                      height: '24px',
                      backgroundColor: 'var(--task-bg)',
                      border: '1px solid var(--task-border)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      zIndex: 1,
                      cursor: 'pointer'
                    }}
                    title={`${task.name}: ${task.progress}% complete`}
                  >
                    {/* Progress Overlay */}
                    <div 
                      className="task-progress-overlay"
                      style={{
                        height: '100%',
                        width: `${task.progress}%`,
                        backgroundColor: 'var(--task-progress)',
                        opacity: 0.8
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default GanttChart;
