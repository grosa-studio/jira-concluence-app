import { useState, useEffect, useRef } from 'react';
import { parseISO, format } from 'date-fns';
import { addBusinessDays, businessDaysBetween, toDateStr } from '../utils/dateUtils';

export function useDrag({ pixelsPerDay, onUpdateTask }) {
  const [dragState, setDragState] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (e) => {
      e.preventDefault();
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (dragState.type === 'height') {
        dragState.onHeightChange(Math.max(200, dragState.initialHeight + dy));
        return;
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setDragPreview({ id: dragState.id, type: dragState.type, dx, barWidth: dragState.barWidth });
      });
    };

    const onMouseUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (dragPreview) {
        const daysDx = Math.round(dragPreview.dx / pixelsPerDay);

        if (dragPreview.type === 'move') {
          const newStart = addBusinessDays(dragState.initialStart, daysDx);
          const newEnd = addBusinessDays(dragState.initialEnd, daysDx);
          onUpdateTask(dragPreview.id, {
            startDate: toDateStr(newStart),
            endDate: toDateStr(newEnd),
          });
        } else if (dragPreview.type === 'resize') {
          const newEnd = addBusinessDays(dragState.initialEnd, daysDx);
          onUpdateTask(dragPreview.id, { endDate: toDateStr(newEnd) });
        } else if (dragPreview.type === 'progress') {
          const progressDelta = (dragPreview.dx / dragPreview.barWidth) * 100;
          onUpdateTask(dragPreview.id, {
            progress: Math.min(100, Math.max(0, Math.round(dragState.initialProgress + progressDelta))),
          });
        }
      }
      setDragState(null);
      setDragPreview(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dragState, dragPreview, pixelsPerDay, onUpdateTask]);

  const startMove = (e, task) => {
    e.preventDefault();
    setDragState({ type: 'move', id: task.id, startX: e.clientX, startY: e.clientY, initialStart: task.startDate, initialEnd: task.endDate });
  };

  const startResize = (e, task) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ type: 'resize', id: task.id, startX: e.clientX, startY: e.clientY, initialEnd: task.endDate });
  };

  const startProgress = (e, task, barWidth) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ type: 'progress', id: task.id, startX: e.clientX, startY: e.clientY, initialProgress: task.progress, barWidth });
  };

  const startHeightResize = (e, initialHeight, onHeightChange) => {
    e.preventDefault();
    setDragState({ type: 'height', startX: e.clientX, startY: e.clientY, initialHeight, onHeightChange });
  };

  return { dragPreview, startMove, startResize, startProgress, startHeightResize };
}
