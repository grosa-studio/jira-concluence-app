import React from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { tokens } from '../tokens';

// Compare a baseline snapshot against current tasks.
export function baselineMetrics(bl, tasks) {
  let shifted = 0;
  tasks.forEach(t => {
    const s = bl.snapshot[t.id];
    if (s && (s.startDate !== t.startDate || s.endDate !== t.endDate)) shifted++;
  });
  const maxEnd = (arr) => arr.reduce((m, d) => (d && d > m ? d : m), '');
  const curEnd = maxEnd(tasks.map(t => t.endDate));
  const blEnd = maxEnd(Object.values(bl.snapshot).map(s => s.endDate));
  let endDelta = 0;
  try { if (curEnd && blEnd) endDelta = differenceInCalendarDays(parseISO(curEnd), parseISO(blEnd)); } catch { /* noop */ }
  return { shifted, endDelta };
}

export function BaselinesPanel({ baselines, tasks, activeId, onSave, onActivate, onDelete, onClose }) {
  const { t, i18n } = useTranslation();
  const fmtDate = (d) => { try { return new Intl.DateTimeFormat(i18n.language || 'en', { day: '2-digit', month: 'short', year: 'numeric' }).format(parseISO(d)); } catch { return d; } };

  return (
    <div style={{
      position: 'absolute', top: 8, left: 8, right: 8, zIndex: 30,
      background: tokens.surfaceOverlay, border: `1px solid ${tokens.border}`,
      borderRadius: tokens.radius.lg, boxShadow: tokens.shadow.lg, padding: tokens.spacing[4],
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[3] }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: tokens.textPrimary }}>⚑ {t('baseline.title')}</span>
        <div style={{ flex: 1 }} />
        <button onClick={onSave} style={{
          padding: '6px 12px', borderRadius: tokens.radius.md, border: `1px solid ${tokens.border}`,
          background: 'transparent', color: tokens.textPrimary, fontWeight: 600, fontSize: '12px', cursor: 'pointer',
        }}>+ {t('baseline.save')}</button>
        <button onClick={onClose} aria-label={t('jira.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: tokens.textSubtle, lineHeight: 1 }}>×</button>
      </div>

      {baselines.length === 0 ? (
        <div style={{ fontSize: '13px', color: tokens.textSubtle, fontStyle: 'italic', padding: `${tokens.spacing[2]} 0` }}>
          {t('baseline.none')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: tokens.spacing[3] }}>
          {baselines.map(bl => {
            const m = baselineMetrics(bl, tasks);
            const active = bl.id === activeId;
            return (
              <div key={bl.id} style={{
                padding: tokens.spacing[3], borderRadius: tokens.radius.md,
                border: `1px solid ${active ? tokens.focus : tokens.border}`,
                background: active ? 'rgba(76,154,255,0.06)' : tokens.surfaceRaised,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? tokens.focus : tokens.borderBold }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: tokens.textPrimary }}>{fmtDate(bl.createdAt)}</span>
                </div>
                <div style={{ borderTop: `1px dashed ${tokens.border}`, marginTop: '6px', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <Row label={t('baseline.shifted')} value={m.shifted} />
                  <Row label={t('baseline.endDelta')} value={`${m.endDelta > 0 ? '+' : ''}${m.endDelta}d`}
                    color={m.endDelta > 0 ? tokens.criticalDeep : m.endDelta < 0 ? tokens.iconSuccess : tokens.textSubtle} />
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: tokens.spacing[2] }}>
                  <button onClick={() => onActivate(active ? null : bl.id)} style={{
                    flex: 1, padding: '5px 8px', borderRadius: tokens.radius.sm, cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                    border: active ? 'none' : `1px solid ${tokens.border}`,
                    background: active ? tokens.focus : 'transparent',
                    color: active ? '#fff' : tokens.textSubtle,
                  }}>{active ? t('baseline.active') : t('baseline.show')}</button>
                  <button onClick={() => onDelete(bl.id)} aria-label={t('baseline.delete')} title={t('baseline.delete')} style={{
                    padding: '5px 9px', borderRadius: tokens.radius.sm, border: `1px solid ${tokens.border}`,
                    background: 'transparent', color: tokens.iconDanger, cursor: 'pointer', fontSize: '11px',
                  }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
      <span style={{ color: tokens.textSubtle }}>{label}</span>
      <span style={{ fontWeight: 700, color: color || tokens.textPrimary }}>{value}</span>
    </div>
  );
}
