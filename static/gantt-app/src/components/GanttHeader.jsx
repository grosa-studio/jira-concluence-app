import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, BRAND } from '../tokens';

export function GanttHeader({ zoomUnit, onZoomChange, onAddTask, onAddPhase, saveStatus, onReload, isReloading, extraActions, colorScheme, onColorByChange, density, onDensityChange, view = 'gantt', onViewChange, criticalCount = 0, onToggleBaselines, baselinesOn, baselineCount = 0, countWeekends = true, onCountWeekends, showDependencies = true, onToggleDependencies }) {
  const { t } = useTranslation();
  const isGantt = view === 'gantt';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      background: tokens.surfaceRaised, borderBottom: `1px solid ${tokens.border}`,
    }}>
      {/* Row 1 — identity · breadcrumb · views · critical · chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: tokens.spacing[3], padding: `0 ${tokens.spacing[4]}`, height: '48px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], minWidth: 0 }}>
          <LogoTile />
          <span style={{ fontFamily: '"Outfit", "Inter", -apple-system, sans-serif', fontSize: '16px', fontWeight: 800, color: tokens.textPrimary, letterSpacing: '-0.4px' }}>
            {BRAND}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', fontWeight: 700, color: tokens.iconSuccess,
            background: 'rgba(31,132,90,0.12)', borderRadius: '999px', padding: '2px 9px', whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.iconSuccess }} />
            {t('header.onTrack')}
          </span>
          {onViewChange && <ViewSwitcher value={view} onChange={onViewChange} />}
          {criticalCount > 0 && <CriticalChip count={criticalCount} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
          <SaveStatus status={saveStatus} />
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#0C66E4,#5E4DB2)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 700, boxShadow: `0 0 0 2px ${tokens.surfaceRaised}`,
          }}>V</div>
          <button title="Share" aria-label="Share" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default',
            width: 30, height: 30, borderRadius: tokens.radius.md, border: 'none',
            background: tokens.textPrimary, color: tokens.surfaceRaised,
          }}>
            <ShareIcon />
          </button>
          <IconButton title="Settings" aria-label="Settings"><GearIcon /></IconButton>
        </div>
      </div>

      {/* Row 2 — chart controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: tokens.spacing[2], padding: `6px ${tokens.spacing[4]}`,
        borderTop: `1px solid ${tokens.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
          {isGantt && <ZoomToggle value={zoomUnit} onChange={onZoomChange} />}
          {onColorByChange && <ColorByToggle value={colorScheme} onChange={onColorByChange} />}
          {isGantt && onDensityChange && <DensityToggle value={density} onChange={onDensityChange} />}
          {onCountWeekends && <WeekendToggle on={countWeekends} onClick={onCountWeekends} />}
          {isGantt && onToggleDependencies && <DependenciesToggle on={showDependencies} onClick={onToggleDependencies} />}
          {onToggleBaselines && <BaselineButton active={baselinesOn} count={baselineCount} onClick={onToggleBaselines} />}
          <IconButton onClick={onReload} disabled={isReloading} title={t('header.reload')} aria-label={t('header.reload')}>
            <ReloadIcon spinning={isReloading} />
          </IconButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
          {extraActions}
          {onAddPhase && <GhostButton onClick={onAddPhase}>{t('header.addPhase')}</GhostButton>}
          {onAddTask && <PrimaryButton onClick={onAddTask}>{t('header.addTask')}</PrimaryButton>}
        </div>
      </div>
    </div>
  );
}

function LogoTile() {
  return (
    <span style={{
      width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
      background: 'linear-gradient(135deg,#0C66E4 0%,#5E4DB2 60%,#E5484D 120%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 6px rgba(94,77,178,0.35)',
    }}>
      <svg width="18" height="18" viewBox="0 0 100 100" fill="none" aria-hidden>
        <rect x="18" y="24" width="40" height="10" rx="5" fill="rgba(255,255,255,0.45)" />
        <rect x="30" y="40" width="30" height="10" rx="5" fill="rgba(255,255,255,0.45)" />
        <rect x="42" y="70" width="34" height="10" rx="5" fill="rgba(255,255,255,0.45)" />
        <rect x="18" y="55" width="60" height="10" rx="5" fill="#fff" />
        <rect x="80" y="56" width="8" height="8" rx="1.5" transform="rotate(45 84 60)" fill="#fff" />
      </svg>
    </span>
  );
}

function ShareIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
}
function GearIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
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

function WeekendToggle({ on, onClick }) {
  const { t } = useTranslation();
  return (
    <button onClick={onClick} title={t('extras.weekends')} aria-pressed={on} style={{
      padding: '6px 10px', borderRadius: tokens.radius.md, cursor: 'pointer',
      fontWeight: 600, fontSize: '12px',
      border: `1px solid ${on ? tokens.iconInfo : tokens.border}`,
      background: on ? 'rgba(76,154,255,0.1)' : 'transparent',
      color: on ? tokens.iconInfo : tokens.textSubtle,
      display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      {t('extras.weekends')}
    </button>
  );
}

function DependenciesToggle({ on, onClick }) {
  const { t } = useTranslation();
  return (
    <button onClick={onClick} title={t('extras.dependencies')} aria-pressed={on} style={{
      padding: '6px 10px', borderRadius: tokens.radius.md, cursor: 'pointer',
      fontWeight: 600, fontSize: '12px',
      border: `1px solid ${on ? tokens.iconInfo : tokens.border}`,
      background: on ? 'rgba(76,154,255,0.1)' : 'transparent',
      color: on ? tokens.iconInfo : tokens.textSubtle,
      display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      {t('extras.dependencies')}
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
      { key: 'assignee', label: t('extras.byAssignee') },
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
