import React from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { tokens, phaseColor, STATUS_COLORS, STATUS_ORDER, normalizeStatus } from '../tokens';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dur = (t) => { try { return Math.max(1, differenceInCalendarDays(parseISO(t.endDate), parseISO(t.startDate)) + 1); } catch { return 1; } };

// Reports view — everything computed from real task data (no mock).
export function GanttReports({ tasks, phases }) {
  const { t } = useTranslation();
  const leaf = tasks.filter(x => !x.isMilestone);
  const milestones = tasks.filter(x => x.isMilestone);
  const completion = leaf.length ? Math.round(leaf.reduce((s, x) => s + (x.progress || 0), 0) / leaf.length) : 0;
  const doneCount = leaf.filter(x => normalizeStatus(x.status) === 'done').length;
  const criticalCount = tasks.filter(x => x.isCritical).length;

  // % of the schedule elapsed (today vs project span)
  let min = Infinity, max = -Infinity;
  tasks.forEach(x => { try { const s = parseISO(x.startDate).getTime(), e = parseISO(x.endDate).getTime(); if (s < min) min = s; if (e > max) max = e; } catch { /* */ } });
  const now = new Date().getTime();
  const elapsed = (isFinite(min) && isFinite(max) && max > min) ? Math.max(0, Math.min(100, Math.round((now - min) / (max - min) * 100))) : 0;
  const behind = completion < elapsed - 5;

  const byPhase = phases.map((p, i) => {
    const pt = tasks.filter(x => x.phase === p.id);
    return { name: p.name, count: pt.length, days: pt.reduce((s, x) => s + dur(x), 0), color: phaseColor(i) };
  });
  const maxPhaseDays = Math.max(1, ...byPhase.map(p => p.days));

  const byStatus = STATUS_ORDER.map(s => ({ s, count: leaf.filter(x => normalizeStatus(x.status) === s).length, color: STATUS_COLORS[s].bar }));
  const statusTotal = byStatus.reduce((s, x) => s + x.count, 0);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: tokens.spacing[5], background: tokens.surfaceSunken }}>
      <h2 style={{ margin: `0 0 ${tokens.spacing[4]}`, fontFamily: '"Outfit","Inter",sans-serif', fontSize: '20px', fontWeight: 700, color: tokens.textPrimary }}>
        {t('nav.reports')}
      </h2>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: tokens.spacing[3], marginBottom: tokens.spacing[4] }}>
        <Kpi label={t('footer.done')} value={`${completion}%`} sub={`${doneCount}/${leaf.length}`} color={tokens.textPrimary} />
        <Kpi label={t('footer.critical')} value={criticalCount} sub={`/ ${tasks.length}`} color={tokens.criticalDeep} />
        <Kpi label={t('reports.tasks')} value={leaf.length} sub="" color={tokens.textPrimary} />
        <Kpi label={t('detail.milestone')} value={milestones.length} sub="" color="#5E4DB2" />
      </div>

      {/* Progress vs schedule */}
      <Card title={`${t('footer.done')} × ${t('reports.elapsed')}`}>
        <MeterRow label={t('footer.done')} pct={completion} color="linear-gradient(90deg,#0C66E4,#5E4DB2)" />
        <MeterRow label={t('reports.elapsed')} pct={elapsed} color={tokens.textSubtle} />
        <div style={{ marginTop: tokens.spacing[2] }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700,
            padding: '3px 10px', borderRadius: '999px',
            color: behind ? tokens.criticalDeep : tokens.iconSuccess,
            background: behind ? 'rgba(229,72,77,0.12)' : 'rgba(31,132,90,0.12)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: behind ? tokens.critical : tokens.iconSuccess }} />
            {behind ? t('detail.slipped') : t('header.onTrack')}
          </span>
        </div>
      </Card>

      <div style={{ height: tokens.spacing[4] }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: tokens.spacing[4] }}>
        {/* By phase */}
        <Card title={t('extras.byPhase')}>
          {byPhase.map((p, i) => (
            <Row key={i} label={p.name} value={`${p.days}d · ${p.count}`} barValue={p.days} barMax={maxPhaseDays} color={p.color} />
          ))}
        </Card>

        {/* By status — donut */}
        <Card title={t('extras.byStatus')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
            <Donut data={byStatus} total={statusTotal} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {byStatus.map(x => (
                <div key={x.s} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontSize: '12px' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '2px', background: x.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(`extras.st${CAP(x.s)}`)}</span>
                  <span style={{ fontWeight: 700, color: tokens.textSubtle }}>{x.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ padding: tokens.spacing[4], background: tokens.surfaceRaised, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg }}>
      <div style={{ fontSize: '10px', fontWeight: 800, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ fontFamily: '"Outfit","Inter",sans-serif', fontSize: '28px', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ fontSize: '12px', color: tokens.textSubtle }}>{sub}</span>}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ padding: tokens.spacing[4], background: tokens.surfaceRaised, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg }}>
      <div style={{ fontSize: '10px', fontWeight: 800, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: tokens.spacing[3] }}>{title}</div>
      {children}
    </div>
  );
}

function MeterRow({ label, pct, color }) {
  return (
    <div style={{ marginBottom: tokens.spacing[2] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: tokens.textSubtle, marginBottom: '3px' }}>
        <span>{label}</span><span style={{ fontWeight: 700, color: tokens.textPrimary }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: tokens.bgNeutral, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function Row({ label, value, barValue, barMax, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: '8px' }}>
      <span style={{ width: 120, flexShrink: 0, fontSize: '12px', fontWeight: 600, color: tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: tokens.bgNeutral, overflow: 'hidden' }}>
        <div style={{ width: `${(barValue / barMax) * 100}%`, height: '100%', background: color }} />
      </div>
      <span style={{ width: 64, flexShrink: 0, textAlign: 'right', fontSize: '11px', fontWeight: 600, color: tokens.textSubtle }}>{value}</span>
    </div>
  );
}

function Donut({ data, total }) {
  const r = 46, C = 2 * Math.PI * r;
  let off = 0;
  const segs = data.filter(d => d.count > 0).map(d => {
    const len = (d.count / Math.max(1, total)) * C;
    const el = (
      <circle key={d.s} cx="60" cy="60" r={r} fill="none" stroke={d.color} strokeWidth="16"
        strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" />
    );
    off += len;
    return el;
  });
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke={tokens.bgNeutral} strokeWidth="16" />
      {total > 0 ? segs : null}
      <text x="60" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill={tokens.textPrimary} fontFamily='"Outfit","Inter",sans-serif'>{total}</text>
    </svg>
  );
}
