import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { tokens } from '../tokens';
import { UserAvatar } from './UserAvatar';

const dur = (a, b) => { try { return differenceInCalendarDays(parseISO(b), parseISO(a)) + 1; } catch { return 0; } };

export function JiraEditPanel({ task, config, pendingEdits, isSaving, saveError, onEdit, onSave, onCancel, tasks = [], users = {}, onSelectTask }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('details');
  const hasPending = Object.keys(pendingEdits).length > 0;

  const tabs = [
    { k: 'details', label: t('jira.tabDetails') },
    { k: 'deps', label: t('detail.dependencies') },
    { k: 'jira', label: 'Jira' },
  ];

  return (
    <div className="detail-panel open" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`, borderBottom: `1px solid ${tokens.border}` }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: tokens.iconInfo }}>{task.jiraIssueKey}</span>
        <button onClick={onCancel} aria-label={t('jira.close')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: tokens.textSubtle, lineHeight: 1 }}>
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: `0 ${tokens.spacing[3]}`, borderBottom: `1px solid ${tokens.border}` }}>
        {tabs.map(tb => (
          <button key={tb.k} onClick={() => setTab(tb.k)}
            style={{
              padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700,
              color: tab === tb.k ? tokens.textPrimary : tokens.textSubtle,
              borderBottom: `2px solid ${tab === tb.k ? tokens.focus : 'transparent'}`,
              marginBottom: -1,
            }}>
            {tb.label}
          </button>
        ))}
      </div>

      <div style={{ padding: tokens.spacing[4], overflowY: 'auto', flex: 1 }}>
        {tab === 'details' && <DetailsTab task={task} pendingEdits={pendingEdits} hasPending={hasPending} isSaving={isSaving} saveError={saveError} onEdit={onEdit} onSave={onSave} onCancel={onCancel} config={config} users={users} t={t} />}
        {tab === 'deps' && <DepsTab task={task} tasks={tasks} onSelectTask={onSelectTask} t={t} />}
        {tab === 'jira' && <JiraTab task={task} t={t} />}
      </div>
    </div>
  );
}

function DetailsTab({ task, pendingEdits, hasPending, isSaving, saveError, onEdit, onSave, onCancel, config, users, t }) {
  const assignees = (task.assigneeIds || []).map(id => users[id]).filter(Boolean);
  return (
    <>
      {hasPending && (
        <div style={{ background: tokens.bgDanger, border: `1px solid ${tokens.iconDanger}`, borderRadius: tokens.radius.md, padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`, marginBottom: tokens.spacing[3] }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: tokens.iconDanger }}>⚠ {t('jira.unsavedChanges')}</span>
        </div>
      )}
      {saveError && (
        <div style={{ background: tokens.bgDanger, borderRadius: tokens.radius.md, padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`, marginBottom: tokens.spacing[3], fontSize: '13px', color: tokens.iconDanger }}>
          {saveError}
        </div>
      )}

      <div style={{ marginBottom: tokens.spacing[3] }}>
        <label style={labelStyle}>{t('jira.fieldName')}</label>
        <input value={task.name} onChange={e => onEdit('name', e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[2], marginBottom: tokens.spacing[3] }}>
        <div>
          <label style={labelStyle}>{t('jira.fieldStart')}</label>
          <input type="date" value={task.startDate} onChange={e => onEdit('startDate', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('jira.fieldEnd')}</label>
          <input type="date" value={task.endDate} onChange={e => onEdit('endDate', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[2], marginBottom: tokens.spacing[3] }}>
        <div>
          <label style={labelStyle}>{t('jira.fieldStatus')}</label>
          <div style={{ fontSize: '13px', color: tokens.textSubtle, padding: '7px 0' }}>{task.status || '—'}</div>
        </div>
        <div>
          <label style={labelStyle}>{t('extras.duration')}</label>
          <div style={{ fontSize: '13px', color: tokens.textSubtle, padding: '7px 0' }}>{dur(task.startDate, task.endDate)}d</div>
        </div>
      </div>

      {assignees.length > 0 && (
        <div style={{ marginBottom: tokens.spacing[4] }}>
          <label style={labelStyle}>{t('detail.assignees')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            {assignees.map(u => (
              <div key={u.accountId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: tokens.textPrimary }}>
                <UserAvatar user={u} size={22} />{u.displayName}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
        {task.siteUrl && (
          <a href={`https://${task.siteUrl}/browse/${task.jiraIssueKey}`} target="_blank" rel="noreferrer"
            style={{ fontSize: '13px', color: tokens.iconInfo, textDecoration: 'none' }}>
            {t('jira.openInJira')}
          </a>
        )}
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <button onClick={() => onSave(config)} disabled={isSaving || !hasPending}
            style={{ ...primaryBtn, opacity: isSaving || !hasPending ? 0.5 : 1, cursor: isSaving || !hasPending ? 'not-allowed' : 'pointer' }}>
            {isSaving ? t('jira.saving') : t('jira.saveToJira')}
          </button>
          <button onClick={onCancel} style={secondaryBtn}>{t('jira.cancel')}</button>
        </div>
      </div>
    </>
  );
}

function DepsTab({ task, tasks, onSelectTask, t }) {
  const blockedBy = (task.dependsOn || []).map(k => tasks.find(x => x.id === k)).filter(Boolean);
  const blocks = tasks.filter(x => (x.dependsOn || []).includes(task.id));
  const Link = ({ d }) => (
    <button onClick={() => onSelectTask && onSelectTask(d.id)}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '7px 9px', marginBottom: '4px',
        background: 'transparent', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md, cursor: 'pointer', textAlign: 'left' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: d.isCritical ? tokens.critical : tokens.iconInfo, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: tokens.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
      <span style={{ fontSize: '10px', color: tokens.textSubtle }}>{d.jiraIssueKey}</span>
    </button>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      <div>
        <div style={depHeader}>↓ {t('detail.blockedBy')} · {blockedBy.length}</div>
        {blockedBy.length === 0 ? <Empty t={t} /> : blockedBy.map(d => <Link key={d.id} d={d} />)}
      </div>
      <div>
        <div style={depHeader}>→ {t('detail.blocks')} · {blocks.length}</div>
        {blocks.length === 0 ? <Empty t={t} /> : blocks.map(d => <Link key={d.id} d={d} />)}
      </div>
    </div>
  );
}

function JiraTab({ task, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
      <div style={{ padding: tokens.spacing[3], border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg, background: tokens.surfaceRaised }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[2] }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: tokens.iconInfo }}>{task.jiraIssueKey}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{task.status || '—'}</span>
        </div>
        <div style={{ fontSize: '13px', color: tokens.textPrimary }}>{task.name}</div>
      </div>
      {task.siteUrl && (
        <a href={`https://${task.siteUrl}/browse/${task.jiraIssueKey}`} target="_blank" rel="noreferrer"
          style={{ ...secondaryBtn, textDecoration: 'none', justifyContent: 'center', display: 'flex' }}>
          {t('jira.openInJira')}
        </a>
      )}
    </div>
  );
}

function Empty({ t }) {
  return <div style={{ fontSize: '12px', color: tokens.textSubtle, fontStyle: 'italic' }}>{t('detail.noDeps')}</div>;
}

const depHeader = {
  fontSize: '10px', fontWeight: 800, color: tokens.textSubtle,
  textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: tokens.spacing[2],
};
const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: tokens.textSubtle, textTransform: 'uppercase',
  letterSpacing: '0.6px', marginBottom: tokens.spacing[1],
};
const inputStyle = {
  width: '100%', padding: '7px 10px',
  border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md,
  fontSize: '13px', color: tokens.textPrimary,
  background: tokens.surfaceRaised, outline: 'none',
};
const primaryBtn = {
  padding: '8px 20px', borderRadius: tokens.radius.md, border: 'none',
  background: 'var(--ds-background-brand-bold, #0052CC)', color: '#fff',
  fontWeight: 700, fontSize: '14px',
};
const secondaryBtn = {
  padding: '8px 20px', borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.border}`,
  background: 'transparent', color: tokens.textPrimary,
  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};
