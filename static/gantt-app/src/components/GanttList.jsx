import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { tokens, phaseColor, STATUS_COLORS, STATUS_ORDER, normalizeStatus } from '../tokens';
import { UserAvatar } from './UserAvatar';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const statusLabel = (st, t) => STATUS_ORDER.includes(st) ? t(`extras.st${CAP(st)}`) : st;
const dur = (a, b) => { try { return differenceInCalendarDays(parseISO(b), parseISO(a)) + 1; } catch { return 0; } };

// Dense, sortable table view over the same tasks (prototype's ProList).
export function GanttList({ tasks, phases, users, selectedTaskId, onSelectTask, colorScheme = 'phase' }) {
  const { t } = useTranslation();
  const [sort, setSort] = useState({ key: 'startDate', dir: 'asc' });
  const phaseIndex = useMemo(() => Object.fromEntries(phases.map((p, i) => [p.id, i])), [phases]);
  const phaseName = (id) => phases.find(p => p.id === id)?.name || '—';

  const cols = [
    { k: 'name', label: t('detail.name'), sortable: true },
    { k: 'phase', label: t('detail.phase'), sortable: true, w: 120 },
    { k: 'status', label: t('extras.statusLabel'), sortable: true, w: 120 },
    { k: 'startDate', label: t('detail.startDate'), sortable: true, w: 110 },
    { k: 'endDate', label: t('detail.endDate'), sortable: true, w: 110 },
    { k: 'duration', label: t('extras.duration'), sortable: false, w: 70 },
    { k: 'progress', label: t('detail.progress'), sortable: true, w: 130 },
    { k: 'jira', label: 'Jira', sortable: false, w: 90 },
    { k: 'assignees', label: t('detail.assignees'), sortable: false, w: 110 },
  ];

  const sorted = useMemo(() => {
    const arr = [...tasks];
    const dir = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va, vb;
      if (sort.key === 'phase') { va = phaseIndex[a.phase] ?? 0; vb = phaseIndex[b.phase] ?? 0; }
      else if (sort.key === 'progress') { va = a.progress; vb = b.progress; }
      else { va = a[sort.key]; vb = b[sort.key]; }
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
    return arr;
  }, [tasks, sort, phaseIndex]);

  const onSort = (k) => setSort(s => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' });

  return (
    <div style={{ flex: 1, overflow: 'auto', background: tokens.surface }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: tokens.font }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.k} onClick={c.sortable ? () => onSort(c.k) : undefined}
                style={{
                  position: 'sticky', top: 0, zIndex: 1, textAlign: 'left',
                  width: c.w, background: tokens.surfaceSunken,
                  borderBottom: `1px solid ${tokens.border}`,
                  padding: '10px 12px', fontSize: '10px', fontWeight: 800,
                  color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.6px',
                  cursor: c.sortable ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none',
                }}>
                {c.label}{sort.key === c.k ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(task => {
            const pIdx = phaseIndex[task.phase] ?? 0;
            const st = task.status || 'notStarted';
            const stColor = STATUS_COLORS[normalizeStatus(st)];
            const accent = task.isCritical ? tokens.critical
              : colorScheme === 'status' ? stColor.bar : phaseColor(pIdx);
            const assignees = (task.assigneeIds || []).map(id => users[id]).filter(Boolean);
            const selected = selectedTaskId === task.id;
            return (
              <tr key={task.id} onClick={() => onSelectTask(task.id)}
                style={{
                  cursor: 'pointer',
                  background: selected ? 'var(--ds-background-selected, #DEEBFF)' : 'transparent',
                  borderLeft: task.isCritical ? `3px solid ${tokens.critical}` : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = tokens.surfaceSunken; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Name */}
                <td style={cell()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {task.isMilestone
                      ? <span style={{ width: 9, height: 9, transform: 'rotate(45deg)', background: accent, flexShrink: 0 }} />
                      : <span style={{ width: 8, height: 8, borderRadius: 2, background: accent, flexShrink: 0 }} />}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: tokens.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.name}
                    </span>
                    {task.isCritical && (
                      <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 700, color: tokens.criticalDeep, background: 'rgba(229,72,77,0.12)', border: `1px solid ${tokens.critical}40`, borderRadius: 3, padding: '0 5px' }}>CP</span>
                    )}
                  </div>
                </td>
                {/* Phase */}
                <td style={cell()}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: phaseColor(pIdx) }}>
                    {phaseName(task.phase)}
                  </span>
                </td>
                {/* Status */}
                <td style={cell()}>
                  {!task.isMilestone && (
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: stColor.fg, background: stColor.bg, borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                      {statusLabel(st, t)}
                    </span>
                  )}
                </td>
                {/* Start / End */}
                <td style={cell()}><span style={dateTxt()}>{task.startDate}</span></td>
                <td style={cell()}><span style={dateTxt()}>{task.endDate}</span></td>
                {/* Duration */}
                <td style={cell()}><span style={{ fontSize: '12px', color: tokens.textSubtle, fontWeight: 600 }}>{dur(task.startDate, task.endDate)}d</span></td>
                {/* Progress */}
                <td style={cell()}>
                  {!task.isMilestone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, height: 6, background: tokens.bgNeutral, borderRadius: 3 }}>
                        <div style={{ width: `${task.progress}%`, height: '100%', borderRadius: 3, background: accent }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: tokens.textSubtle, width: 30, textAlign: 'right' }}>{task.progress}%</span>
                    </div>
                  )}
                </td>
                {/* Jira */}
                <td style={cell()}>
                  {task.jiraIssueKey && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: tokens.iconInfo, background: 'rgba(76,154,255,0.1)', padding: '2px 6px', borderRadius: tokens.radius.sm, whiteSpace: 'nowrap' }}>
                      {task.jiraIssueKey}
                    </span>
                  )}
                </td>
                {/* Assignees */}
                <td style={cell()}>
                  {assignees.length > 0 && (
                    <div style={{ display: 'flex' }}>
                      {assignees.slice(0, 3).map((u, i) => (
                        <div key={u.accountId} style={{ marginLeft: i === 0 ? 0 : -6 }}><UserAvatar user={u} size={22} /></div>
                      ))}
                      {assignees.length > 3 && (
                        <span style={{ marginLeft: 6, fontSize: '10px', color: tokens.textSubtle, fontWeight: 600, alignSelf: 'center' }}>+{assignees.length - 3}</span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function cell() {
  return { padding: '8px 12px', borderBottom: `1px solid ${tokens.border}`, verticalAlign: 'middle', whiteSpace: 'nowrap' };
}
function dateTxt() {
  return { fontSize: '12px', color: tokens.textSubtle };
}
