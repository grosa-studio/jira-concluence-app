import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../../tokens';
import { GANTT } from '../../tokens';

export function PhaseRow({ phase, color, isCollapsed, onToggle, onAddTask, onMoveUp, onMoveDown, durationDays = 0, hideActions = false }) {
  const { t } = useTranslation();
  return (
    <div
      className="phase-row"
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: tokens.spacing[2],
        height: GANTT.PHASE_HEADER_HEIGHT,
        padding: `0 ${tokens.spacing[3]}`,
        background: tokens.surfaceSunken,
        borderLeft: `3px solid ${color}`,
        borderBottom: `1px solid ${tokens.border}`,
        cursor: 'pointer', userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill={tokens.textSubtle}
        style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
        <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{ flex: 1, fontSize: '11px', fontWeight: 800, color: tokens.textPrimary, textTransform: 'uppercase', letterSpacing: '0.8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {phase.name}
      </span>
      {durationDays > 0 && (
        <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 700, color: tokens.textSubtle, whiteSpace: 'nowrap' }}>
          {durationDays}d
        </span>
      )}
      {!hideActions && (
        <div className="phase-row-actions" style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <SmallBtn onClick={onMoveUp} title={t('sidebar.moveUp')}>↑</SmallBtn>
          <SmallBtn onClick={onMoveDown} title={t('sidebar.moveDown')}>↓</SmallBtn>
          <SmallBtn onClick={onAddTask} title={t('sidebar.addTask')} style={{ color: tokens.iconSuccess }}>+</SmallBtn>
        </div>
      )}
    </div>
  );
}

function SmallBtn({ onClick, title, children, style }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 5px', fontSize: '13px', color: tokens.textSubtle, lineHeight: 1, borderRadius: tokens.radius.sm, ...style }}>
      {children}
    </button>
  );
}
