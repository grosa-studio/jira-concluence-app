import React from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, differenceInCalendarDays, format } from 'date-fns';
import { tokens, phaseColor, STATUS_COLORS, STATUS_ORDER, normalizeStatus } from '../tokens';
import { taskDuration } from '../utils/duration';
import { useSettings } from '../contexts/settings';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Reports view — everything computed from real task data (no mock).
export function GanttReports({ tasks, phases, baseline }) {
  const { t } = useTranslation();
  const { countWeekends } = useSettings();
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
    return { name: p.name, count: pt.length, days: pt.reduce((s, x) => s + taskDuration(x.startDate, x.endDate, countWeekends), 0), color: phaseColor(i) };
  });
  const maxPhaseDays = Math.max(1, ...byPhase.map(p => p.days));

  const byStatus = STATUS_ORDER.map(s => ({ s, count: leaf.filter(x => normalizeStatus(x.status) === s).length, color: STATUS_COLORS[s].bar }));
  const statusTotal = byStatus.reduce((s, x) => s + x.count, 0);

  const todayMs = new Date().getTime();
  const ms = milestones.map(x => {
    let end = 0, dateLabel = x.endDate;
    try { end = parseISO(x.endDate).getTime(); dateLabel = format(parseISO(x.endDate), 'dd MMM yyyy'); } catch { /* */ }
    const done = normalizeStatus(x.status) === 'done';
    return { name: x.name, end, done, overdue: !!end && end < todayMs && !done, dateLabel };
  }).sort((a, b) => a.end - b.end);

  const phaseCost = phases.map((p, i) => ({ name: p.name, color: phaseColor(i), cost: tasks.filter(x => x.phase === p.id).reduce((s, x) => s + (x.cost || 0), 0) }));
  const totalCost = phaseCost.reduce((s, p) => s + p.cost, 0);
  const maxCost = Math.max(1, ...phaseCost.map(p => p.cost));

  const slips = (baseline?.snapshot) ? tasks.filter(x => !x.isMilestone && baseline.snapshot[x.id]).map(x => {
    let slip = 0; try { slip = differenceInCalendarDays(parseISO(x.endDate), parseISO(baseline.snapshot[x.id].endDate)); } catch { /* */ }
    return { name: x.name, slip };
  }).filter(s => s.slip !== 0).sort((a, b) => b.slip - a.slip) : [];

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
            background: behind ? tokens.bgDanger : tokens.bgSuccess,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: behind ? tokens.critical : tokens.iconSuccess }} />
            {behind ? t('detail.slipped') : t('header.onTrack')}
          </span>
        </div>
      </Card>

      <div style={{ height: tokens.spacing[4] }} />
      <Burndown tasks={tasks} t={t} />

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

        <Card title={t('detail.milestone')}>
          {ms.length === 0 ? (
            <div style={{ fontSize: '12px', color: tokens.textSubtle }}>—</div>
          ) : ms.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px' }}>
              <span style={{ width: 9, height: 9, transform: 'rotate(45deg)', flexShrink: 0, background: m.overdue ? tokens.critical : m.done ? tokens.iconSuccess : tokens.iconWarning }} />
              <span style={{ flex: 1, minWidth: 0, fontWeight: m.overdue ? 700 : 500, color: m.overdue ? tokens.criticalDeep : tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
              <span style={{ color: tokens.textSubtle, whiteSpace: 'nowrap' }}>{m.dateLabel}</span>
            </div>
          ))}
        </Card>

        {totalCost > 0 && (
          <Card title={t('detail.cost')}>
            {phaseCost.filter(p => p.cost > 0).map((p, i) => (
              <Row key={i} label={p.name} value={Math.round(p.cost).toLocaleString()} barValue={p.cost} barMax={maxCost} color={p.color} />
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: tokens.spacing[2], paddingTop: tokens.spacing[2], borderTop: `1px solid ${tokens.border}`, fontSize: '12px', fontWeight: 700, color: tokens.textPrimary }}>
              <span>Σ</span><span>{Math.round(totalCost).toLocaleString()}</span>
            </div>
          </Card>
        )}

        {slips.length > 0 && (
          <Card title={`${t('detail.slipped')} · ${t('baseline.title')}`}>
            {slips.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px' }}>
                <span style={{ flex: 1, minWidth: 0, color: tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                <span style={{ fontWeight: 700, color: s.slip > 0 ? tokens.criticalDeep : tokens.iconSuccess }}>{s.slip > 0 ? `+${s.slip}d` : `${s.slip}d`}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function Burndown({ tasks, t }) {
  const { countWeekends } = useSettings();
  const leaf = tasks.filter(x => !x.isMilestone);
  let min = Infinity, max = -Infinity;
  tasks.forEach(x => { try { const s = parseISO(x.startDate).getTime(), e = parseISO(x.endDate).getTime(); if (s < min) min = s; if (e > max) max = e; } catch { /* */ } });
  if (!isFinite(min) || !isFinite(max) || max <= min || !leaf.length) return null;
  const totalDays = leaf.reduce((s, x) => s + taskDuration(x.startDate, x.endDate, countWeekends), 0) || 1;

  const W = 600, H = 150, padL = 26, padB = 16, padT = 8, padR = 8;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const N = 40;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const dayMs = min + (max - min) * (i / N);
    const remDays = leaf.filter(x => { try { return parseISO(x.endDate).getTime() > dayMs; } catch { return false; } }).reduce((s, x) => s + taskDuration(x.startDate, x.endDate, countWeekends), 0);
    const rem = (remDays / totalDays) * 100;
    pts.push([padL + plotW * (i / N), padT + plotH * (1 - rem / 100)]);
  }
  const path = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const todayPct = Math.max(0, Math.min(1, (new Date().getTime() - min) / (max - min)));
  const todayX = padL + plotW * todayPct;
  const completion = leaf.reduce((s, x) => s + (x.progress || 0), 0) / leaf.length;
  const actualY = padT + plotH * (1 - (100 - completion) / 100);

  return (
    <Card title="Burndown">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="170" preserveAspectRatio="none" style={{ display: 'block' }}>
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke={tokens.border} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={tokens.border} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={path} fill="none" stroke={tokens.textSubtle} strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        <line x1={todayX} y1={padT} x2={todayX} y2={padT + plotH} stroke={tokens.iconWarning} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <circle cx={todayX} cy={actualY} r="3.5" fill="#0C66E4" stroke="var(--ds-surface-raised,#fff)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', gap: tokens.spacing[4], marginTop: tokens.spacing[2], fontSize: '11px', color: tokens.textSubtle }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 14, height: 0, borderTop: `2px dashed ${tokens.textSubtle}` }} />{t('reports.planned')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: tokens.textBrand }} />{t('reports.actual')}</span>
      </div>
    </Card>
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
