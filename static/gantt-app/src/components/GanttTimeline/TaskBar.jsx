import React from 'react';
import { tokens, avatarColor, initials } from '../../tokens';

export function TaskBar({
  task, x, width, y, fill, accent, barH = 24, rowH = 52, assignees = [], isCritical,
  dragPreview, onStartMove, onStartResize, onStartProgress,
  onHoverEnter, onHoverMove, onHoverLeave,
}) {
  const isDragging = dragPreview?.id === task.id;
  const barMargin = (rowH - barH) / 2;
  const R = barH / 2;

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

  const barY = y + barMargin;
  const progressW = (displayW * displayProgress) / 100;
  const hover = { onMouseEnter: (e) => onHoverEnter(e, task), onMouseMove: onHoverMove, onMouseLeave: onHoverLeave };

  // ── Milestone ──
  if (task.isMilestone) {
    const s = Math.round(barH * 0.4);
    return (
      <g transform={`translate(${displayX + displayW / 2}, ${y + rowH / 2})`} {...hover}>
        <polygon
          points={`0,${-s} ${s},0 0,${s} ${-s},0`}
          fill={isCritical ? tokens.criticalDeep : accent}
          stroke="#fff" strokeWidth="1.5" filter="url(#bar-shadow)"
          onMouseDown={(e) => onStartMove(e, task)} style={{ cursor: 'move' }}
        />
        <text x={s + 6} y={4} fontSize="11" fontWeight="600" fill={tokens.textSubtle} pointerEvents="none">
          {task.name}
        </text>
      </g>
    );
  }

  const jiraKey = task.jiraIssueKey;
  const showJira = !!jiraKey && displayW > 120;
  const jiraChipW = showJira ? Math.min(64, jiraKey.length * 6.5 + 12) : 0;
  const rightReserve = showJira ? jiraChipW + 6 : 0;
  const showAvatars = (displayW - rightReserve) > 110 && assignees.length > 0;
  const avatarCount = Math.min(2, assignees.length);
  const avatarSpace = showAvatars ? avatarCount * (barH - 4) + 8 : 0;
  const labelChars = Math.floor((displayW - 18 - avatarSpace - rightReserve) / 6.2);
  const showLabel = displayW > 54;

  return (
    <g {...hover}>
      {/* Ghost while dragging */}
      {isDragging && dragPreview.type !== 'progress' && (
        <rect x={x} y={barY} width={Math.max(8, width)} height={barH} rx={R}
          fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      )}

      {/* Critical glow */}
      {isCritical && (
        <rect x={displayX - 1.5} y={barY - 1.5} width={displayW + 3} height={barH + 3} rx={R + 1.5}
          fill="none" stroke={tokens.criticalLight} strokeWidth="1" opacity="0.5" pointerEvents="none" />
      )}

      {/* Bar */}
      <rect x={displayX} y={barY} width={displayW} height={barH} rx={R}
        fill={fill} filter="url(#bar-shadow)" className="gantt-bar-move"
        onMouseDown={(e) => onStartMove(e, task)}
        style={{ cursor: 'move', opacity: isDragging ? 0.8 : 1 }} />

      {/* Progress overlay */}
      {progressW > 0 && (
        <rect x={displayX} y={barY} width={progressW} height={barH} rx={R}
          fill="rgba(0,0,0,0.22)" pointerEvents="none" />
      )}

      {/* Label */}
      {showLabel && (
        <text x={displayX + 10} y={barY + barH / 2 + 4} fontSize="11" fontWeight="600" fill="#fff"
          pointerEvents="none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
          {labelChars >= 4 && task.name.length > labelChars ? task.name.slice(0, labelChars - 1) + '…' : task.name}
        </text>
      )}

      {/* Avatars on bar */}
      {showAvatars && assignees.slice(0, 2).map((u, i) => {
        const r = barH / 2 - 3;
        const cx = displayX + displayW - 10 - rightReserve - i * (barH - 4);
        const cy = barY + barH / 2;
        return (
          <g key={u.accountId} pointerEvents="none">
            <circle cx={cx} cy={cy} r={r} fill={avatarColor(u.accountId)} stroke="#fff" strokeWidth="1.5" />
            <text x={cx} y={cy + 3} fontSize="8" fontWeight="700" fill="#fff" textAnchor="middle">{initials(u.displayName)}</text>
          </g>
        );
      })}

      {/* Jira key chip on bar */}
      {showJira && (
        <g pointerEvents="none">
          <rect x={displayX + displayW - jiraChipW - 6} y={barY + 3} width={jiraChipW} height={barH - 6} rx={3}
            fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
          <text x={displayX + displayW - jiraChipW / 2 - 6} y={barY + barH / 2 + 3} fontSize="9" fontWeight="700"
            fill={tokens.textSubtle} textAnchor="middle">{jiraKey}</text>
        </g>
      )}

      {/* Resize handle */}
      <rect x={displayX + displayW - 8} y={barY} width={8} height={barH} fill="transparent"
        className="gantt-bar-resize" onMouseDown={(e) => onStartResize(e, task)} />

      {/* Progress handle */}
      <circle cx={displayX + progressW} cy={barY + barH / 2} r={5}
        fill="#fff" stroke={isCritical ? tokens.criticalDeep : accent} strokeWidth="2"
        style={{ cursor: 'ew-resize' }} onMouseDown={(e) => onStartProgress(e, task, displayW)} />

      {/* Progress label */}
      <text x={displayX + displayW + 8} y={barY + barH / 2 + 4} fontSize="10" fontWeight="700"
        fill={tokens.textSubtle} pointerEvents="none">
        {displayProgress}%
      </text>
    </g>
  );
}
