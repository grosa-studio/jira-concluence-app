import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, BRAND } from '../tokens';

export function GanttHeader({ zoomUnit, onZoomChange, onAddTask, onAddPhase, saveStatus, onReload, isReloading, extraActions, colorScheme, onColorByChange, density, onDensityChange, view = 'gantt', onViewChange, criticalCount = 0, onToggleBaselines, baselinesOn, baselineCount = 0 }) {
  const { t } = useTranslation();
  const isGantt = view === 'gantt';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `0 ${tokens.spacing[4]}`,
      height: '52px',
      background: tokens.surfaceRaised,
      borderBottom: `1px solid ${tokens.border}`,
      flexShrink: 0,
      gap: tokens.spacing[3],
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
        <span style={{ fontSize: '17px', fontWeight: 800, color: tokens.textPrimary, letterSpacing: '-0.4px' }}>
          {BRAND}
        </span>
        {onViewChange && <ViewSwitcher value={view} onChange={onViewChange} />}
        {isGantt && <ZoomToggle value={zoomUnit} onChange={onZoomChange} />}
        {onColorByChange && <ColorByToggle value={colorScheme} onChange={onColorByChange} />}
        {isGantt && onDensityChange && <DensityToggle value={density} onChange={onDensityChange} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
        {criticalCount > 0 && <CriticalChip count={criticalCount} />}
        <SaveStatus status={saveStatus} />
        <IconButton onClick={onReload} disabled={isReloading} title={t('header.reload')} aria-label={t('header.reload')}>
          <ReloadIcon spinning={isReloading} />
        </IconButton>
        {onToggleBaselines && <BaselineButton active={baselinesOn} count={baselineCount} onClick={onToggleBaselines} />}
        {extraActions}
        {onAddPhase && <GhostButton onClick={onAddPhase}>{t('header.addPhase')}</GhostButton>}
        {onAddTask && <PrimaryButton onClick={onAddTask}>{t('header.addTask')}</PrimaryButton>}
      </div>
    </div>
  );
}

function ZoomToggle({ value, onChange }) {
  const { t } = useTranslation();
  const options = [
    { key: 'days',    label: t('header.zoom.days') },
    { key: 'weeks',   label: t('header.zoom.weeks') },
    { key: 'months',  label: t('header.zoom.months') },
    { key: 'quarter', label: t('extras.quarters') },
  ];
  return (
    <div style={{ display: 'flex', background: tokens.surfaceSunken, borderRadius: tokens.radius.md, padding: '3px', gap: '2px' }}>
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            padding: '5px 14px', border: 'none', cursor: 'pointer',
            borderRadius: tokens.radius.sm, fontWeight: 700, fontSize: '12px',
            background: value === o.key ? tokens.surfaceRaised : 'transparent',
            color: value === o.key ? tokens.textPrimary : tokens.textSubtle,
            boxShadow: value === o.key ? tokens.shadow.sm : 'none',
            transition: 'all 0.15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', background: tokens.surfaceSunken, borderRadius: tokens.radius.md, padding: '3px', gap: '2px' }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} title={o.title}
          style={{
            padding: '5px 12px', border: 'none', cursor: 'pointer',
            borderRadius: tokens.radius.sm, fontWeight: 700, fontSize: '12px',
            background: value === o.key ? tokens.surfaceRaised : 'transparent',
            color: value === o.key ? tokens.textPrimary : tokens.textSubtle,
            boxShadow: value === o.key ? tokens.shadow.sm : 'none',
            transition: 'all 0.15s',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ViewSwitcher({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <Segmented value={value || 'gantt'} onChange={onChange} options={[
      { key: 'gantt', label: t('extras.viewGantt') },
      { key: 'list', label: t('extras.viewList') },
      { key: 'board', label: t('extras.viewBoard') },
      { key: 'calendar', label: t('extras.viewCalendar') },
    ]} />
  );
}

function BaselineButton({ active, count, onClick }) {
  const { t } = useTranslation();
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: tokens.radius.md, cursor: 'pointer',
      fontWeight: 600, fontSize: '13px',
      border: `1px solid ${active ? '#5E4DB2' : tokens.border}`,
      background: active ? 'rgba(94,77,178,0.1)' : 'transparent',
      color: active ? '#5E4DB2' : tokens.textPrimary,
      display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      ⚑ {t('baseline.button')}{count > 0 ? ` · ${count}` : ''}
    </button>
  );
}

function CriticalChip({ count }) {
  const { t } = useTranslation();
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      fontSize: '11px', fontWeight: 700,
      color: tokens.criticalDeep, background: 'rgba(229,72,77,0.12)',
      border: `1px solid ${tokens.critical}40`, borderRadius: '999px', padding: '3px 10px',
      whiteSpace: 'nowrap',
    }}>
      ⚑ {t('extras.criticalPath')} · {count}
    </span>
  );
}

function ColorByToggle({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <Segmented value={value || 'phase'} onChange={onChange} options={[
      { key: 'phase', label: t('extras.byPhase') },
      { key: 'status', label: t('extras.byStatus') },
    ]} />
  );
}

function DensityToggle({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <Segmented value={value || 'comfortable'} onChange={onChange} options={[
      { key: 'comfortable', label: '≣', title: t('extras.comfortable') },
      { key: 'compact', label: '≡', title: t('extras.compact') },
    ]} />
  );
}

function SaveStatus({ status }) {
  const { t } = useTranslation();
  const map = {
    saving: { text: t('header.saving'), color: tokens.iconInfo,    dot: true },
    saved:  { text: t('header.saved'),  color: tokens.iconSuccess,  dot: false },
    error:  { text: t('header.saveError'), color: tokens.iconDanger, dot: false },
    idle:   { text: '',                 color: tokens.textSubtle,   dot: false },
  };
  const s = map[status] || map.idle;
  if (!s.text) return null;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: s.color, fontWeight: 600 }}>
      {s.dot && <span className="save-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block' }} />}
      {s.text}
    </span>
  );
}

function IconButton({ onClick, disabled, title, children, 'aria-label': ariaLabel }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      style={{
        width: 30, height: 30, borderRadius: tokens.radius.md,
        border: `1px solid ${tokens.border}`, background: 'transparent',
        color: tokens.textSubtle, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function ReloadIcon({ spinning }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}>
      <path d="M12.5 2.5A6 6 0 1 1 8 1.1" />
      <polyline points="12.5 1 12.5 4 9.5 4" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

function GhostButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: tokens.radius.md,
      border: `1px solid ${tokens.border}`,
      background: 'transparent', color: tokens.textPrimary,
      fontWeight: 600, fontSize: '13px', cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: tokens.radius.md, border: 'none',
      background: 'var(--ds-background-brand-bold, #0052CC)', color: '#fff',
      fontWeight: 700, fontSize: '13px', cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,82,204,0.2)',
    }}>
      {children}
    </button>
  );
}
