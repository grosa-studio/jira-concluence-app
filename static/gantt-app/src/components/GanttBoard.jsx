import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { tokens, phaseColor, STATUS_COLORS, STATUS_ORDER, normalizeStatus } from '../tokens';
import { UserAvatar } from './UserAvatar';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dur = (a, b) => { try { return differenceInCalendarDays(parseISO(b), parseISO(a)) + 1; } catch { return 0; } };

// Kanban board grouped by status (prototype's ProBoardKanban).
export function GanttBoard({ tasks, phases, users, selectedTaskId, onSelectTask, colorScheme = 'phase' }) {
  const { t } = useTranslation();
  const phaseIndex = useMemo(() => Object.fromEntries(phases.map((p, i) => [p.id, i])), [phases]);
  const phaseName = (id) => phases.find(p => p.id === id)?.name || '—';

  const byStatus = useMemo(() => {
    const m = Object.fromEntries(STATUS_ORDER.map(s => [s, []]));
    tasks.forEach(tk => { m[normalizeStatus(tk.status)].push(tk); });
    return m;
  }, [tasks]);

  return (
    <div style={{ flex: 1, overflow: 'auto', background: tokens.surfaceSunken, padding: tokens.spacing[3] }}>
      <div style={{ display: 'flex', gap: tokens.spacing[3], alignItems: 'flex-start', minHeight: '100%' }}>
        {STATUS_ORDER.map(s => {
          const items = byStatus[s] || [];
          const sc = STATUS_COLORS[s];
          return (
            <div key={s} style={{
              width: 268, flexShrink: 0, background: tokens.surface,
              border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg,
              display: 'flex', flexDirection: 'column', maxHeight: '100%',
            }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: tokens.spacing[2],
                padding: '10px 12px', borderBottom: `1px solid ${tokens.border}`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.bar }} />
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: tokens.textPrimary }}>
                  {t(`extras.st${CAP(s)}`)}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: sc.fg, background: sc.bg, borderRadius: '999px', padding: '1px 7px' }}>
                  {items.length}
                </span>
              </div>
              {/* Cards */}
              <div style={{ padding: tokens.spacing[2], overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                {items.length === 0 ? (
                  <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '11px', color: tokens.textDisabled, fontStyle: 'italic' }}>—</div>
                ) : items.map(task => {
                  const pIdx = phaseIndex[task.phase] ?? 0;
                  const accent = task.isCritical ? tokens.critical
                    : colorScheme === 'status' ? sc.bar : phaseColor(pIdx);
                  const assignees = (task.assigneeIds || []).map(id => users[id]).filter(Boolean);
                  const selected = selectedTaskId === task.id;
                  return (
                    <button key={task.id} onClick={() => onSelectTask(task.id)} className="gantt-empty-card"
                      style={{
                        textAlign: 'left', font: 'inherit', cursor: 'pointer',
                        padding: '10px 12px', borderRadius: tokens.radius.md,
                        background: tokens.surface,
                        border: `1px solid ${selected ? tokens.focus : tokens.border}`,
                        borderLeft: `3px solid ${accent}`,
                        boxShadow: selected ? `0 0 0 2px var(--ds-background-selected, #DEEBFF)` : 'none',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                      }}>
                      {/* Phase + badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: phaseColor(pIdx) }}>
                          {phaseName(task.phase)}
                        </span>
                        {task.isCritical && (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: tokens.criticalDeep, background: 'rgba(229,72,77,0.12)', border: `1px solid ${tokens.critical}40`, borderRadius: 3, padding: '0 5px' }}>CP</span>
                        )}
                        {task.isMilestone && <span style={{ width: 8, height: 8, transform: 'rotate(45deg)', background: accent, marginLeft: 'auto' }} />}
                      </div>
                      {/* Name */}
                      <div style={{ fontSize: '13px', fontWeight: 600, color: tokens.textPrimary, lineHeight: 1.35, wordBreak: 'break-word' }}>
                        {task.name}
                      </div>
                      {/* Dates */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: tokens.textSubtle }}>
                        <span>{task.startDate} → {task.endDate}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{dur(task.startDate, task.endDate)}d</span>
                      </div>
                      {/* Progress */}
                      {!task.isMilestone && task.progress > 0 && (
                        <div style={{ height: 4, background: tokens.bgNeutral, borderRadius: 2 }}>
                          <div style={{ width: `${task.progress}%`, height: '100%', borderRadius: 2, background: accent }} />
                        </div>
                      )}
                      {/* Footer: avatars + jira */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {assignees.length > 0 && (
                          <div style={{ display: 'flex' }}>
                            {assignees.slice(0, 3).map((u, i) => (
                              <div key={u.accountId} style={{ marginLeft: i === 0 ? 0 : -6 }}><UserAvatar user={u} size={20} /></div>
                            ))}
                          </div>
                        )}
                        <div style={{ flex: 1 }} />
                        {task.jiraIssueKey && (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: tokens.iconInfo, background: 'rgba(76,154,255,0.1)', padding: '2px 6px', borderRadius: tokens.radius.sm }}>
                            {task.jiraIssueKey}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
