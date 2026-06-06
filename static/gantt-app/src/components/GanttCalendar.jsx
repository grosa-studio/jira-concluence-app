import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, startOfMonth, startOfWeek, addDays, addMonths, format } from 'date-fns';
import { tokens, phaseColor, STATUS_COLORS, normalizeStatus } from '../tokens';

const fmt = (d) => format(d, 'yyyy-MM-dd');

// Month calendar with multi-week task bars (prototype's ProCalendar, simplified).
export function GanttCalendar({ tasks, phases, selectedTaskId, onSelectTask, colorScheme = 'phase' }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const phaseIndex = useMemo(() => Object.fromEntries(phases.map((p, i) => [p.id, i])), [phases]);

  const [vm, setVm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const monthStart = new Date(vm.y, vm.m, 1);
  const firstWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(firstWeek, i)), [vm.y, vm.m]);
  const todayStr = fmt(new Date());

  const weekdays = useMemo(() => {
    const base = startOfWeek(new Date(2024, 0, 1), { weekStartsOn: 1 });
    const f = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => f.format(addDays(base, i)));
  }, [locale]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(monthStart);

  const accentFor = (task) => task.isCritical ? tokens.critical
    : colorScheme === 'status' ? STATUS_COLORS[normalizeStatus(task.status)].bar
    : phaseColor(phaseIndex[task.phase] ?? 0);

  // Bar spans clamped to the 42-day grid
  const bars = useMemo(() => {
    const out = [];
    tasks.forEach(task => {
      let s = days.findIndex(d => fmt(d) === task.startDate);
      let e = days.findIndex(d => fmt(d) === task.endDate);
      const sd = parseISO(task.startDate), ed = parseISO(task.endDate);
      if (s < 0 && e < 0) { if (sd < days[0] && ed > days[41]) { s = 0; e = 41; } else return; }
      out.push({ task, s: s < 0 ? 0 : s, e: e < 0 ? 41 : e });
    });
    return out;
  }, [tasks, days]);

  const go = (delta) => setVm(({ y, m }) => { const d = addMonths(new Date(y, m, 1), delta); return { y: d.getFullYear(), m: d.getMonth() }; });
  const goToday = () => { const d = new Date(); setVm({ y: d.getFullYear(), m: d.getMonth() }); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: tokens.surfaceSunken }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], padding: '10px 16px', background: tokens.surfaceRaised, borderBottom: `1px solid ${tokens.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: tokens.textPrimary, textTransform: 'capitalize' }}>{monthLabel}</span>
        <div style={{ display: 'flex', gap: '2px' }}>
          <NavBtn onClick={() => go(-1)}>‹</NavBtn>
          <button onClick={goToday} style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm, cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: tokens.textSubtle }}>
            {t('status.today')}
          </button>
          <NavBtn onClick={() => go(1)}>›</NavBtn>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: tokens.spacing[3] }}>
        <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg, overflow: 'hidden' }}>
          {/* Weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: tokens.surfaceSunken, borderBottom: `1px solid ${tokens.border}` }}>
            {weekdays.map((w, i) => (
              <div key={i} style={{ padding: '8px', textAlign: 'center', fontSize: '10px', fontWeight: 800, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{w}</div>
            ))}
          </div>
          {/* 6 weeks */}
          {Array.from({ length: 6 }).map((_, wk) => {
            const weekBars = bars
              .filter(b => b.s < (wk + 1) * 7 && b.e >= wk * 7)
              .map(b => ({ ...b, ws: Math.max(0, b.s - wk * 7), we: Math.min(6, b.e - wk * 7), startsHere: b.s >= wk * 7 }));
            // greedy slot stacking
            const slots = [];
            weekBars.forEach(b => {
              let slot = 0;
              while (slots[slot] && slots[slot].some(x => !(b.ws > x.we || b.we < x.ws))) slot++;
              (slots[slot] || (slots[slot] = [])).push(b);
              b.slot = slot;
            });
            const rowH = Math.max(96, 26 + slots.length * 20 + 8);
            return (
              <div key={wk} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wk < 5 ? `1px solid ${tokens.border}` : 'none', minHeight: rowH }}>
                {days.slice(wk * 7, wk * 7 + 7).map((d, di) => {
                  const inMonth = d.getMonth() === vm.m;
                  const isToday = fmt(d) === todayStr;
                  const isWk = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={di} style={{ borderRight: di < 6 ? `1px solid ${tokens.border}` : 'none', padding: '5px 7px', background: isToday ? 'rgba(54,179,126,0.06)' : isWk ? tokens.surfaceSunken : 'transparent' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: isToday ? 800 : 600,
                        color: !inMonth ? tokens.textDisabled : (isToday ? '#fff' : tokens.textSubtle),
                        ...(isToday ? { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: tokens.iconSuccess } : {}),
                      }}>{d.getDate()}</span>
                    </div>
                  );
                })}
                {/* bars */}
                {weekBars.map(b => {
                  const accent = accentFor(b.task);
                  const left = (b.ws / 7) * 100;
                  const width = ((b.we - b.ws + 1) / 7) * 100;
                  const selected = selectedTaskId === b.task.id;
                  return (
                    <div key={b.task.id + '-' + wk} onClick={() => onSelectTask(b.task.id)} title={b.task.name}
                      style={{
                        position: 'absolute', left: `calc(${left}% + 3px)`, width: `calc(${width}% - 6px)`,
                        top: 26 + b.slot * 20, height: 17, background: accent, borderRadius: tokens.radius.sm,
                        display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px', cursor: 'pointer', overflow: 'hidden',
                        boxShadow: tokens.shadow.sm, outline: selected ? `2px solid ${tokens.focus}` : 'none',
                      }}>
                      {b.task.isMilestone && <span style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: '#fff', flexShrink: 0 }} />}
                      {b.startsHere && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}>
                          {b.task.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NavBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, border: `1px solid ${tokens.border}`, background: 'transparent',
      borderRadius: tokens.radius.sm, cursor: 'pointer', color: tokens.textSubtle, fontSize: '16px', lineHeight: 1,
    }}>{children}</button>
  );
}
