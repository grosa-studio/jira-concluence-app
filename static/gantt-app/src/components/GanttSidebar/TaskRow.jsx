import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, GANTT, STATUS_COLORS, STATUS_ORDER, normalizeStatus } from '../../tokens';
import { UserAvatar } from '../UserAvatar';
import { taskDuration } from '../../utils/duration';
import { useSettings } from '../../contexts/settings';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const statusLabel = (st, t) => STATUS_ORDER.includes(st) ? t(`extras.st${CAP(st)}`) : st;

export function TaskRow({ task, users, isSelected, onSelect, onUpdate, onDelete, onMoveUp, onMoveDown, rowH = GANTT.ROW_HEIGHT, density = 'comfortable' }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);

  const assignees = (task.assigneeIds || []).map(id => users[id]).filter(Boolean);
  const st = task.status || 'notStarted';
  const stColor = STATUS_COLORS[normalizeStatus(st)];
  const isCrit = !!task.isCritical;
  const { countWeekends } = useSettings();
  const dur = taskDuration(task.startDate, task.endDate, countWeekends);
  const slack = task.float;
  const showSlack = !task.isMilestone && Number.isFinite(slack) && (isCrit || (task.dependsOn?.length > 0));

  const commitName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== task.name) onUpdate(task.id, { name: trimmed });
    setEditing(false);
  };

  const rowBg = isSelected ? 'var(--ds-background-selected, #DEEBFF)' : tokens.surfaceRaised;

  return (
    <div
      className="task-row"
      onClick={() => onSelect(task.id)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: tokens.spacing[2],
        height: rowH,
        padding: `0 ${tokens.spacing[3]}`,
        background: isSelected ? 'var(--ds-background-selected, #DEEBFF)' : 'transparent',
        borderLeft: isCrit ? `3px solid ${tokens.iconDanger}` : '3px solid transparent',
        borderBottom: `1px solid ${tokens.border}`,
        cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.12s',
      }}
    >
      {/* Name + badges (flexible, truncates) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
        {task.isMilestone ? (
          <span style={{ color: tokens.iconWarning, fontSize: '12px', flexShrink: 0 }}>◆</span>
        ) : (
          <span title={statusLabel(st, t)} style={{ width: 8, height: 8, borderRadius: '50%', background: stColor.bar, flexShrink: 0 }} />
        )}
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditing(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, minWidth: 0, border: `1.5px solid ${tokens.focus}`, borderRadius: tokens.radius.sm,
              padding: '3px 6px', fontSize: '13px', outline: 'none',
              background: tokens.surfaceRaised, color: tokens.textPrimary,
            }}
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); setEditing(true); setEditName(task.name); }}
            style={{
              flex: 1, minWidth: 0, fontSize: '13px', color: tokens.textPrimary, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {task.name}
          </span>
        )}

        {/* Jira badge */}
        {task.jiraIssueKey && (
          <span style={{
            flexShrink: 0, fontSize: '10px', fontWeight: 700, color: tokens.iconInfo,
            background: 'rgba(76,154,255,0.1)', padding: '2px 6px',
            borderRadius: tokens.radius.sm, whiteSpace: 'nowrap',
          }}>
            {task.jiraIssueKey}
          </span>
        )}
      </div>

      {/* Duration + slack column — critical is signalled by red value + left bar (no CP/0s noise) */}
      <div title={isCrit ? t('extras.criticalPath') : undefined} style={{
        width: 54, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap',
        fontSize: '11px', fontWeight: isCrit ? 700 : 500,
        color: isCrit ? tokens.criticalDeep : tokens.textSubtle,
      }}>
        {!task.isMilestone && `${dur}d`}
        {showSlack && !isCrit && (
          <span style={{ marginLeft: '4px', fontSize: '9px', fontWeight: 700, color: tokens.iconSuccess }}>
            +{slack}
          </span>
        )}
      </div>

      {/* Assignee column */}
      <div style={{ width: 56, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {assignees.slice(0, 2).map((u, i) => (
          <div key={u.accountId} style={{ marginLeft: i === 0 ? 0 : '-6px' }}>
            <UserAvatar user={u} size={22} />
          </div>
        ))}
      </div>

      {/* Action buttons — overlay on hover (no layout shift) */}
      <div className="task-row-actions" onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, bottom: 0, right: tokens.spacing[3],
          display: 'flex', alignItems: 'center', gap: '2px', paddingLeft: '14px',
          background: `linear-gradient(90deg, transparent, ${rowBg} 35%)`,
        }}>
        <ActionBtn onClick={() => onMoveUp(task.id)} title={t('sidebar.moveUp')}>↑</ActionBtn>
        <ActionBtn onClick={() => onMoveDown(task.id)} title={t('sidebar.moveDown')}>↓</ActionBtn>
        <ActionBtn onClick={() => onDelete(task.id)} title={t('sidebar.delete')} danger>✕</ActionBtn>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, children, danger }) {
  return (
    <button onClick={onClick} title={title}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '3px 5px', fontSize: '12px', lineHeight: 1,
        color: danger ? tokens.iconDanger : tokens.textSubtle,
        borderRadius: tokens.radius.sm,
      }}>
      {children}
    </button>
  );
}
