import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../tokens';

export function GanttHeader({ zoomUnit, onZoomChange, onAddTask, onAddPhase, saveStatus, onReload, isReloading }) {
  const { t } = useTranslation();
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
          Gantt
        </span>
        <ZoomToggle value={zoomUnit} onChange={onZoomChange} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
        <SaveStatus status={saveStatus} />
        <IconButton onClick={onReload} disabled={isReloading} title={t('header.reload')} aria-label={t('header.reload')}>
          <ReloadIcon spinning={isReloading} />
        </IconButton>
        <GhostButton onClick={onAddPhase}>{t('header.addPhase')}</GhostButton>
        <PrimaryButton onClick={onAddTask}>{t('header.addTask')}</PrimaryButton>
      </div>
    </div>
  );
}

function ZoomToggle({ value, onChange }) {
  const { t } = useTranslation();
  const options = [
    { key: 'days',   label: t('header.zoom.days') },
    { key: 'weeks',  label: t('header.zoom.weeks') },
    { key: 'months', label: t('header.zoom.months') },
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
