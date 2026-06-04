import React from 'react';
import { tokens, GANTT } from '../../tokens';

const BAR_H = 24;
const BAR_MARGIN = (GANTT.ROW_HEIGHT - BAR_H) / 2;

export function TaskBar({ task, x, width, y, color, isCritical, dragPreview, onStartMove, onStartResize, onStartProgress }) {
  const isDragging = dragPreview?.id === task.id;

  let displayX = x;
  let displayW = Math.max(8, width);
  let displayProgress = task.progress;

  if (isDragging) {
    if (dragPreview.type === 'move') displayX += dragPreview.dx;
    if (dragPreview.type === 'resize') displayW = Math.max(8, width + dragPreview.dx);
    if (dragPreview.type === 'progress') {
      displayProgress = Math.min(100, Math.max(0, Math.round(task.progress + (dragPreview.dx / dragPreview.barWidth) * 100)));
    }
  }

  const barY = y + BAR_MARGIN;
  const progressW = (displayW * displayProgress) / 100;
  const barColor = isCritical ? tokens.iconDanger : color;
  const progressColor = isCritical ? '#c0392b' : darken(color, 20);

  if (task.isMilestone) {
    return (
      <g transform={`translate(${displayX + displayW / 2}, ${y + GANTT.ROW_HEIGHT / 2})`}>
        <polygon
          points="0,-10 10,0 0,10 -10,0"
          fill={tokens.iconWarning}
          stroke="#e67e22"
          strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
        />
      </g>
    );
  }

  return (
    <g>
      {/* Ghost (original position) while dragging */}
      {isDragging && dragPreview.type !== 'progress' && (
        <rect x={x} y={barY} width={Math.max(8, width)} height={BAR_H} rx="6"
          fill="none" stroke={barColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      )}

      {/* Bar background */}
      <rect
        x={displayX} y={barY} width={displayW} height={BAR_H} rx="6"
        fill={barColor} fillOpacity="0.12"
        stroke={barColor} strokeWidth="1.5"
        className="gantt-bar-move"
        onMouseDown={(e) => onStartMove(e, task)}
        style={{ cursor: 'move', opacity: isDragging ? 0.75 : 1 }}
      />

      {/* Progress fill */}
      {progressW > 0 && (
        <rect x={displayX} y={barY} width={progressW} height={BAR_H} rx="6"
          fill={progressColor} fillOpacity="0.85" pointerEvents="none" />
      )}

      {/* Critical path top stripe */}
      {isCritical && (
        <rect x={displayX} y={barY} width={displayW} height={3} rx="1.5"
          fill={tokens.iconDanger} pointerEvents="none" />
      )}

      {/* Resize handle */}
      <rect
        x={displayX + displayW - 8} y={barY} width={8} height={BAR_H}
        fill="transparent" className="gantt-bar-resize"
        onMouseDown={(e) => onStartResize(e, task)}
      />

      {/* Progress handle */}
      <circle
        cx={displayX + progressW} cy={barY + BAR_H / 2} r={5}
        fill={progressColor} stroke="#fff" strokeWidth="2"
        style={{ cursor: 'ew-resize' }}
        onMouseDown={(e) => onStartProgress(e, task, displayW)}
      />

      {/* Progress label */}
      <text x={displayX + displayW + 6} y={barY + BAR_H / 2 + 4}
        fontSize="10" fontWeight="700" fill={tokens.textSubtle}>
        {displayProgress}%
      </text>
    </g>
  );
}

function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
