import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, GANTT } from '../../tokens';
import { UserAvatar } from '../UserAvatar';

export function TaskRow({ task, users, isSelected, onSelect, onUpdate, onDelete, onMoveUp, onMoveDown }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);

  const assignees = (task.assigneeIds || []).map(id => users[id]).filter(Boolean);

  const commitName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== task.name) onUpdate(task.id, { name: trimmed });
    setEditing(false);
  };

  return (
    <div
      className="task-row"
      onClick={() => onSelect(task.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: tokens.spacing[2],
        height: GANTT.ROW_HEIGHT,
        padding: `0 ${tokens.spacing[3]}`,
        background: isSelected ? 'var(--ds-background-selected, #DEEBFF)' : 'transparent',
        borderLeft: task.isCritical ? `3px solid ${tokens.iconDanger}` : '3px solid transparent',
        borderBottom: `1px solid ${tokens.border}`,
        cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.12s',
      }}
    >
      {/* Milestone diamond */}
      {task.isMilestone && (
        <span style={{ color: tokens.iconWarning, fontSize: '12px', flexShrink: 0 }}>◆</span>
      )}

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditing(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', border: `1.5px solid ${tokens.focus}`, borderRadius: tokens.radius.sm,
              padding: '3px 6px', fontSize: '13px', outline: 'none',
              background: tokens.surfaceRaised, color: tokens.textPrimary,
            }}
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); setEditing(true); setEditName(task.name); }}
            style={{
              fontSize: '13px', color: tokens.textPrimary, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
            }}
          >
            {task.name}
          </span>
        )}
      </div>

      {/* Jira badge */}
      {task.jiraIssueKey && (
        <span style={{
          fontSize: '10px', fontWeight: 700, color: tokens.iconInfo,
          background: 'rgba(76,154,255,0.1)', padding: '2px 6px',
          borderRadius: tokens.radius.sm, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {task.jiraIssueKey}
        </span>
      )}

      {/* Assignee avatars */}
      {assignees.length > 0 && (
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {assignees.slice(0, 2).map(u => (
            <div key={u.accountId} style={{ marginLeft: '-4px' }}>
              <UserAvatar user={u} size={22} />
            </div>
          ))}
        </div>
      )}

      {/* Action buttons — revealed on hover via CSS */}
      <div className="task-row-actions" style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
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
