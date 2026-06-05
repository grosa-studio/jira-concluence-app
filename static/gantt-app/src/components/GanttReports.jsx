import React from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { tokens, phaseColor, STATUS_COLORS, STATUS_ORDER, normalizeStatus } from '../tokens';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dur = (t) => { try { return Math.max(1, differenceInCalendarDays(parseISO(t.endDate), parseISO(t.startDate)) + 1); } catch { return 1; } };

// Reports view — all metrics computed from real task data (no mock).
export function GanttReports({ tasks, phases }) {
  const { t } = useTranslation();
  const leaf = tasks.filter(x => !x.isMilestone);
  const completion = leaf.length ? Math.round(leaf.reduce((s, x) => s + (x.progress || 0), 0) / leaf.length) : 0;
  const doneCount = leaf.filter(x => normalizeStatus(x.status) === 'done').length;
  const criticalCount = tasks.filter(x => x.isCritical).length;

  const byPhase = phases.map((p, i) => {
    const pt = tasks.filter(x => x.phase === p.id);
    return { name: p.name, count: pt.length, days: pt.reduce((s, x) => s + dur(x), 0), color: phaseColor(i) };
  });
  const maxPhaseDays = Math.max(1, ...byPhase.map(p => p.days));

  const byStatus = STATUS_ORDER.map(s => ({ s, count: leaf.filter(x => normalizeStatus(x.status) === s).length, color: STATUS_COLORS[s].bar }));
  const maxStatus = Math.max(1, ...byStatus.map(x => x.count));

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: tokens.spacing[5], background: tokens.surfaceSunken }}>
      <h2 style={{ margin: `0 0 ${tokens.spacing[4]}`, fontFamily: '"Outfit","Inter",sans-serif', fontSize: '20px', fontWeight: 700, color: tokens.textPrimary }}>
        {t('nav.reports')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: tokens.spacing[4] }}>
        <Card title={t('footer.done')}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: '"Outfit","Inter",sans-serif', fontSize: '34px', fontWeight: 800, color: tokens.textPrimary, lineHeight: 1 }}>{completion}%</span>
            <span style={{ fontSize: '12px', color: tokens.textSubtle }}>{doneCount}/{leaf.length}</span>
          </div>
          <Bar value={completion} max={100} color="linear-gradient(90deg,#0C66E4,#5E4DB2)" />
        </Card>

        <Card title={t('footer.critical')}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: '"Outfit","Inter",sans-serif', fontSize: '34px', fontWeight: 800, color: tokens.criticalDeep, lineHeight: 1 }}>{criticalCount}</span>
            <span style={{ fontSize: '12px', color: tokens.textSubtle }}>/ {tasks.length}</span>
          </div>
          <Bar value={criticalCount} max={Math.max(1, tasks.length)} color={tokens.critical} />
        </Card>

        <Card title={t('extras.byPhase')} wide>
          {byPhase.map((p, i) => (
            <Row key={i} label={p.name} value={`${p.days}d · ${p.count}`} barValue={p.days} barMax={maxPhaseDays} color={p.color} />
          ))}
        </Card>

        <Card title={t('extras.byStatus')} wide>
          {byStatus.map(x => (
            <Row key={x.s} label={t(`extras.st${CAP(x.s)}`)} value={String(x.count)} barValue={x.count} barMax={maxStatus} color={x.color} />
          ))}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children, wide }) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : 'auto', padding: tokens.spacing[4], background: tokens.surfaceRaised, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg }}>
      <div style={{ fontSize: '10px', fontWeight: 800, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: tokens.spacing[3] }}>{title}</div>
      {children}
    </div>
  );
}

function Bar({ value, max, color }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: tokens.bgNeutral, overflow: 'hidden', marginTop: tokens.spacing[2] }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color }} />
    </div>
  );
}

function Row({ label, value, barValue, barMax, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: '8px' }}>
      <span style={{ width: 140, flexShrink: 0, fontSize: '12px', fontWeight: 600, color: tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: tokens.bgNeutral, overflow: 'hidden' }}>
        <div style={{ width: `${(barValue / barMax) * 100}%`, height: '100%', background: color }} />
      </div>
      <span style={{ width: 64, flexShrink: 0, textAlign: 'right', fontSize: '11px', fontWeight: 600, color: tokens.textSubtle }}>{value}</span>
    </div>
  );
}
