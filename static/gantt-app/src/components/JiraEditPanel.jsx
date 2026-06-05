import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../tokens';

export function JiraEditPanel({ task, config, pendingEdits, isSaving, saveError, onEdit, onSave, onCancel }) {
  const { t } = useTranslation();
  const hasPending = Object.keys(pendingEdits).length > 0;
  const current = { ...task, ...pendingEdits };

  return (
    <div className="detail-panel open" style={{ padding: tokens.spacing[4] }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[3] }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: tokens.textPrimary }}>{task.jiraIssueKey}</span>
        <button onClick={onCancel} aria-label={t('jira.close')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: tokens.textSubtle, lineHeight: 1 }}>
          ×
        </button>
      </div>

      {/* Pending badge */}
      {hasPending && (
        <div style={{
          background: tokens.bgDanger, border: `1px solid ${tokens.iconDanger}`,
          borderRadius: tokens.radius.md, padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
          marginBottom: tokens.spacing[3],
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: tokens.iconDanger }}>
            ⚠ {t('jira.unsavedChanges')}
          </span>
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div style={{
          background: tokens.bgDanger, borderRadius: tokens.radius.md,
          padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
          marginBottom: tokens.spacing[3], fontSize: '13px', color: tokens.iconDanger,
        }}>
          {saveError}
        </div>
      )}

      {/* Name */}
      <div style={{ marginBottom: tokens.spacing[3] }}>
        <label style={labelStyle}>{t('jira.fieldName')}</label>
        <input value={current.name} onChange={e => onEdit('name', e.target.value)} style={inputStyle} />
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[2], marginBottom: tokens.spacing[3] }}>
        <div>
          <label style={labelStyle}>{t('jira.fieldStart')}</label>
          <input type="date" value={current.startDate} onChange={e => onEdit('startDate', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('jira.fieldEnd')}</label>
          <input type="date" value={current.endDate} onChange={e => onEdit('endDate', e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Status (read-only) */}
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <label style={labelStyle}>{t('jira.fieldStatus')}</label>
        <div style={{
          fontSize: '13px', color: tokens.textSubtle, padding: '7px 0',
          borderBottom: `1px solid ${tokens.border}`,
        }}>
          {task.status || '—'}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
        {task.siteUrl && (
          <a href={`https://${task.siteUrl}/browse/${task.jiraIssueKey}`}
            target="_blank" rel="noreferrer"
            style={{ fontSize: '13px', color: tokens.iconInfo, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {t('jira.openInJira')}
          </a>
        )}
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <button
            onClick={() => onSave(config)}
            disabled={isSaving || !hasPending}
            style={{
              ...primaryBtn,
              opacity: isSaving || !hasPending ? 0.5 : 1,
              cursor: isSaving || !hasPending ? 'not-allowed' : 'pointer',
            }}>
            {isSaving ? t('jira.saving') : t('jira.saveToJira')}
          </button>
          <button onClick={onCancel} style={secondaryBtn}>{t('jira.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

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
