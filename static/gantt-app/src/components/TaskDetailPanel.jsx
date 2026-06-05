import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { invoke } from '@forge/bridge';
import { tokens, phaseColor, STATUS_ORDER } from '../tokens';
import { UserAvatar } from './UserAvatar';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);
import { isValidIssueKey, formatIssueKey } from '../utils/jiraUtils';

const TABS = [
  { k: 'details', label: 'jira.tabDetails' },
  { k: 'deps', label: 'detail.dependsOn' },
  { k: 'jira', label: null },
];

export function TaskDetailPanel({ task, tasks, phases, users, onUpdate, onClose, baseline }) {
  const { t } = useTranslation();
  const baseSnap = baseline?.snapshot?.[task.id];
  let baseEndShift = 0;
  if (baseSnap) { try { baseEndShift = differenceInCalendarDays(parseISO(task.endDate), parseISO(baseSnap.endDate)); } catch { baseEndShift = 0; } }

  let durationDays = 1;
  try { durationDays = Math.max(1, differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate)) + 1); } catch { durationDays = 1; }
  const slack = task.float;
  const slackText = task.isCritical ? '0d' : (Number.isFinite(slack) && (task.dependsOn?.length > 0) ? `+${slack}d` : '—');
  const slackColor = task.isCritical ? tokens.iconDanger : (slackText.startsWith('+') ? tokens.iconSuccess : tokens.textSubtle);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [jiraQuery, setJiraQuery] = useState('');
  const [jiraResults, setJiraResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchingJira, setSearchingJira] = useState(false);
  const [tab, setTab] = useState('details');
  const userDebounce = useRef(null);
  const jiraDebounce = useRef(null);

  const searchUsers = useCallback(async (q) => {
    if (!q.trim()) { setUserResults([]); return; }
    if (userDebounce.current) clearTimeout(userDebounce.current);
    userDebounce.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await invoke('searchUsers', { query: q });
        if (res?.success) setUserResults(res.data || []);
      } finally {
        setSearchingUsers(false);
      }
    }, 350);
  }, []);

  const searchJira = useCallback(async (q) => {
    if (!q.trim()) { setJiraResults([]); return; }
    if (jiraDebounce.current) clearTimeout(jiraDebounce.current);
    jiraDebounce.current = setTimeout(async () => {
    setSearchingJira(true);
      try {
        const res = await invoke('searchJiraIssues', { query: q });
        if (res?.success) setJiraResults(res.data || []);
      } finally {
        setSearchingJira(false);
      }
    }, 350);
  }, []);

  const assignees = (task.assigneeIds || []).map(id => users[id]).filter(Boolean);
  const otherTasks = tasks.filter(t => t.id !== task.id);
  const phaseIdx = phases.findIndex(p => p.id === task.phase);
  const phaseObj = phases[phaseIdx];
  const accent = task.isCritical ? tokens.critical : phaseColor(phaseIdx < 0 ? 0 : phaseIdx);

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: tokens.spacing[4] }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: tokens.spacing[1] }}>
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className={`detail-panel open`} style={{ padding: tokens.spacing[4] }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[4] }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: tokens.textPrimary }}>{t('detail.title')}</span>
        <button onClick={onClose} aria-label={t('detail.close')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.textSubtle, fontSize: '18px', lineHeight: 1 }}>
          ×
        </button>
      </div>

      {/* Badge row: phase · milestone · critical */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: tokens.spacing[3] }}>
        {phaseObj && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
            color: accent, background: `${accent}1A`, borderRadius: '999px', padding: '3px 9px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
            {phaseObj.name}
          </span>
        )}
        {task.isMilestone && (
          <span style={{
            fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
            color: tokens.iconWarning, background: 'rgba(255,171,0,0.12)', borderRadius: '999px', padding: '3px 9px',
          }}>
            ◆ {t('detail.milestone')}
          </span>
        )}
        {task.isCritical && (
          <span style={{
            fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
            color: tokens.criticalDeep, background: 'rgba(229,72,77,0.12)', borderRadius: '999px', padding: '3px 9px',
          }}>
            ⚠ {t('detail.criticalPath')}
          </span>
        )}
        {baseEndShift > 0 && (
          <span style={{
            fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
            color: tokens.iconDanger, background: 'rgba(229,72,77,0.12)', borderRadius: '999px', padding: '3px 9px',
          }}>
            ⚠ +{baseEndShift}d
          </span>
        )}
      </div>

      {/* Slip / critical banners */}
      {baseEndShift > 0 && (
        <div style={{ marginBottom: tokens.spacing[3], padding: '8px 10px', background: 'rgba(94,77,178,0.08)', border: '1px solid rgba(94,77,178,0.3)', borderRadius: tokens.radius.md, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#5E4DB2' }}>⚠ {t('detail.slipped')} +{baseEndShift}d</span>
          <span style={{ color: tokens.textSubtle }}>{t('baseline.vs')} {t('baseline.title')}</span>
        </div>
      )}
      {task.isCritical && (
        <div style={{ marginBottom: tokens.spacing[3], padding: '8px 10px', background: 'rgba(229,72,77,0.1)', border: '1px solid rgba(229,72,77,0.3)', borderRadius: tokens.radius.md, fontSize: '12px', color: tokens.criticalDeep }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>⚑ {t('detail.criticalTask')}</div>
          <div style={{ marginTop: '2px', opacity: 0.85, lineHeight: 1.4 }}>{t('detail.criticalHint')}</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: `1px solid ${tokens.border}`, marginBottom: tokens.spacing[4] }}>
        {TABS.map(tb => (
          <button key={tb.k} onClick={() => setTab(tb.k)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '6px 10px', fontSize: '12px', fontWeight: 700,
            color: tab === tb.k ? tokens.textPrimary : tokens.textSubtle,
            borderBottom: `2px solid ${tab === tb.k ? tokens.focus : 'transparent'}`,
            marginBottom: '-1px',
          }}>{tb.label ? t(tb.label) : 'Jira'}</button>
        ))}
      </div>

      {tab === 'details' && (<>
      {/* Name */}
      <Field label={t('detail.name')}>
        <input value={task.name}
          onChange={e => onUpdate(task.id, { name: e.target.value })}
          style={inputStyle} />
      </Field>

      {/* Phase */}
      <Field label={t('detail.phase')}>
        <select value={task.phase} onChange={e => onUpdate(task.id, { phase: e.target.value })} style={inputStyle}>
          {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>

      {/* Status */}
      {!task.isMilestone && (
        <Field label={t('extras.statusLabel')}>
          <select value={task.status || 'notStarted'} onChange={e => onUpdate(task.id, { status: e.target.value })} style={inputStyle}>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{t(`extras.st${CAP(s)}`)}</option>)}
          </select>
        </Field>
      )}

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[2], marginBottom: tokens.spacing[4] }}>
        <div>
          <label style={labelStyle}>{t('detail.startDate')}</label>
          <input type="date" value={task.startDate} onChange={e => onUpdate(task.id, { startDate: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('detail.endDate')}</label>
          <input type="date" value={task.endDate} onChange={e => onUpdate(task.id, { endDate: e.target.value })} style={inputStyle} />
        </div>
      </div>

      {/* Duration + slack (folga) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[2], marginBottom: tokens.spacing[4] }}>
        <div>
          <label style={labelStyle}>{t('extras.duration')}</label>
          <div style={metricBox}>{durationDays}d</div>
        </div>
        {!task.isMilestone && (
          <div>
            <label style={labelStyle}>{t('detail.slack')}</label>
            <div style={{ ...metricBox, color: slackColor, fontWeight: 700 }}>{slackText}</div>
          </div>
        )}
      </div>

      {/* Progress */}
      <Field label={`${t('detail.progress')} — ${task.progress}%`}>
        <div style={{ height: 8, borderRadius: 4, background: tokens.bgNeutral, overflow: 'hidden', marginBottom: tokens.spacing[2] }}>
          <div style={{ width: `${task.progress}%`, height: '100%', borderRadius: 4, background: accent, transition: 'width 0.15s' }} />
        </div>
        <input type="range" min="0" max="100" value={task.progress}
          onChange={e => onUpdate(task.id, { progress: Number(e.target.value) })}
          style={{ width: '100%', accentColor: accent }} />
      </Field>

      {/* Baseline comparison */}
      {baseSnap && (
        <div style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[3], border: '1px solid rgba(94,77,178,0.3)', background: 'rgba(94,77,178,0.06)', borderRadius: tokens.radius.md }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5E4DB2', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: tokens.spacing[2] }}>
            ⚑ {t('baseline.vs')} {t('baseline.title')}
          </div>
          <BaseRow label={`${t('detail.startDate')}`} value={baseSnap.startDate} />
          <BaseRow label={`${t('detail.endDate')}`} value={baseSnap.endDate} />
          {baseEndShift !== 0 && (
            <BaseRow label={t('baseline.endDelta')} value={`${baseEndShift > 0 ? '+' : ''}${baseEndShift}d`}
              color={baseEndShift > 0 ? tokens.iconDanger : tokens.iconSuccess} />
          )}
        </div>
      )}

      {/* Estimated cost */}
      <Field label={t('detail.cost')}>
        <input type="number" min="0" step="any" value={task.cost ?? ''} placeholder="0"
          onChange={e => onUpdate(task.id, { cost: e.target.value === '' ? null : Number(e.target.value) })}
          style={inputStyle} />
      </Field>

      {/* Milestone toggle */}
      <Field label={t('detail.milestone')}>
        <button onClick={() => onUpdate(task.id, { isMilestone: !task.isMilestone })}
          role="switch" aria-checked={!!task.isMilestone}
          style={{ ...toggleStyle, background: task.isMilestone ? tokens.iconWarning : 'transparent',
            color: task.isMilestone ? '#fff' : tokens.textSubtle,
            borderColor: task.isMilestone ? tokens.iconWarning : tokens.border }}>
          ◆ {t('detail.milestone')}
        </button>
      </Field>
      </>)}

      {tab === 'deps' && (
      <Field label={t('detail.dependsOn')}>
        <select
          value=""
          onChange={e => {
            const id = e.target.value;
            if (!id || (task.dependsOn || []).includes(id)) return;
            onUpdate(task.id, { dependsOn: [...(task.dependsOn || []), id] });
          }}
          style={inputStyle}
        >
          <option value="">{t('detail.none')}</option>
          {otherTasks.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {(task.dependsOn || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
            {task.dependsOn.map(depId => {
              const dep = tasks.find(t => t.id === depId);
              if (!dep) return null;
              return (
                <span key={depId} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: tokens.bgNeutral,
                  borderRadius: tokens.radius.sm, padding: '3px 6px 3px 8px', fontSize: '12px', color: tokens.textPrimary }}>
                  {dep.name}
                  <select
                    value={task.depTypes?.[depId]?.type || 'FS'}
                    onChange={e => onUpdate(task.id, { depTypes: { ...(task.depTypes || {}), [depId]: { type: e.target.value, lag: task.depTypes?.[depId]?.lag || 0 } } })}
                    style={{ border: 'none', background: 'transparent', fontSize: '10px', fontWeight: 700, color: tokens.iconInfo, cursor: 'pointer', outline: 'none' }}>
                    {['FS', 'SS', 'FF', 'SF'].map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <button onClick={() => onUpdate(task.id, { dependsOn: task.dependsOn.filter(d => d !== depId) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.textSubtle, fontSize: '12px', padding: 0, lineHeight: 1 }}>×</button>
                </span>
              );
            })}
          </div>
        )}
      </Field>
      )}

      {tab === 'details' && (
      <Field label={t('detail.assignees')}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {assignees.map(u => (
            <div key={u.accountId} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: tokens.bgNeutral,
              borderRadius: '20px', padding: '2px 8px 2px 2px', fontSize: '12px' }}>
              <UserAvatar user={u} size={20} />
              {u.displayName}
              <button onClick={() => onUpdate(task.id, { assigneeIds: task.assigneeIds.filter(id => id !== u.accountId) })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.textSubtle, fontSize: '12px', padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
        <input
          value={userQuery}
          onChange={e => { setUserQuery(e.target.value); searchUsers(e.target.value); }}
          placeholder={t('detail.searchUsers')}
          style={inputStyle}
        />
        {searchingUsers && <div style={{ fontSize: '11px', color: tokens.textSubtle, marginTop: '4px' }}>...</div>}
        {userResults.length > 0 && (
          <div style={{ background: tokens.surfaceRaised, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md, marginTop: '4px', maxHeight: '140px', overflowY: 'auto' }}>
            {userResults.map(u => (
              <div key={u.accountId}
                onClick={() => {
                  if (!(task.assigneeIds || []).includes(u.accountId)) {
                    onUpdate(task.id, { assigneeIds: [...(task.assigneeIds || []), u.accountId] });
                  }
                  setUserQuery(''); setUserResults([]);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: 'pointer', fontSize: '13px',
                  background: 'transparent', borderBottom: `1px solid ${tokens.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = tokens.surfaceSunken}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <UserAvatar user={u} size={22} />
                {u.displayName}
              </div>
            ))}
          </div>
        )}
      </Field>
      )}

      {tab === 'jira' && (
      <Field label={t('detail.jiraIssue')}>
        {task.jiraIssueKey ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: tokens.iconInfo, fontSize: '13px' }}>{task.jiraIssueKey}</span>
            <button onClick={() => onUpdate(task.id, { jiraIssueKey: '' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.iconDanger, fontSize: '13px' }}>✕</button>
          </div>
        ) : (
          <>
            <input
              value={jiraQuery}
              onChange={e => { setJiraQuery(e.target.value); if (e.target.value.length > 2) searchJira(e.target.value); }}
              onBlur={() => {
                const key = formatIssueKey(jiraQuery);
                if (isValidIssueKey(key)) { onUpdate(task.id, { jiraIssueKey: key }); setJiraQuery(''); }
              }}
              placeholder={t('detail.searchIssues')}
              style={inputStyle}
            />
            {jiraResults.length > 0 && (
              <div style={{ background: tokens.surfaceRaised, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md, marginTop: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                {jiraResults.map(issue => (
                  <div key={issue.key}
                    onClick={() => { onUpdate(task.id, { jiraIssueKey: issue.key }); setJiraQuery(''); setJiraResults([]); }}
                    style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: `1px solid ${tokens.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = tokens.surfaceSunken}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 700, color: tokens.iconInfo, marginRight: '8px' }}>{issue.key}</span>
                    <span style={{ color: tokens.textPrimary }}>{issue.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Field>
      )}
    </div>
  );
}

function BaseRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0' }}>
      <span style={{ color: tokens.textSubtle }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || tokens.textPrimary }}>{value}</span>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '7px 10px',
  border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md,
  fontSize: '13px', color: tokens.textPrimary,
  background: tokens.surfaceRaised, outline: 'none',
};

const metricBox = {
  padding: '7px 10px', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md,
  fontSize: '13px', fontWeight: 600, color: tokens.textPrimary, background: tokens.surfaceSunken,
};

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: tokens.textSubtle, textTransform: 'uppercase',
  letterSpacing: '0.6px', marginBottom: tokens.spacing[1],
};

const toggleStyle = {
  padding: '5px 12px', borderRadius: tokens.radius.md, cursor: 'pointer',
  fontWeight: 700, fontSize: '12px', border: '1px solid',
  transition: 'all 0.15s',
};
