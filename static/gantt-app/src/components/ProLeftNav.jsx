import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, BRAND } from '../tokens';

// Left navigation shell, ported from the prototype ProLeftNav. In a single-chart
// Forge macro the multi-project list is informational (one chart per page), so it
// shows the current chart's summary; Baselines is wired to the real panel, the
// other routes are visual placeholders for now.
export function ProLeftNav({ activeRoute = 'board', onRoute, baselineCount = 0, onBaselines, baselinesActive, progress = 0, criticalCount = 0 }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? 52 : 216;

  const items = [
    { k: 'timeline', label: t('nav.timeline'), icon: TimelineIcon, onClick: () => onRoute?.('board'), active: activeRoute === 'board' },
    { k: 'baselines', label: t('baseline.title'), icon: FlagIcon, badge: baselineCount || null, onClick: onBaselines, active: baselinesActive },
    { k: 'reports', label: t('nav.reports'), icon: ReportsIcon, onClick: () => onRoute?.('reports'), active: activeRoute === 'reports' },
    { k: 'resources', label: t('nav.resources'), icon: UsersIcon, onClick: () => onRoute?.('resources'), active: activeRoute === 'resources' },
    { k: 'integrations', label: t('nav.integrations'), icon: LinkIcon, badge: 'Jira' },
  ];

  return (
    <div style={{
      width: W, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${tokens.border}`, background: tokens.surfaceSunken,
      transition: 'width 0.18s', overflow: 'hidden',
    }}>
      {/* Workspace */}
      <div style={{ padding: collapsed ? '10px 8px' : '10px 10px', borderBottom: `1px solid ${tokens.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: collapsed ? 0 : '6px', background: collapsed ? 'transparent' : tokens.surfaceRaised, border: collapsed ? 'none' : `1px solid ${tokens.border}`, borderRadius: tokens.radius.md }}>
          <span style={{ width: 24, height: 24, borderRadius: '5px', flexShrink: 0, background: 'linear-gradient(135deg,#0C66E4,#5E4DB2)', color: '#fff', fontWeight: 800, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {BRAND[0]}
          </span>
          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{BRAND}</div>
              <div style={{ fontSize: '10px', color: tokens.textSubtle }}>Workspace</div>
            </div>
          )}
        </div>
      </div>

      {/* This project */}
      <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '8px 6px' : '10px 8px' }}>
        {!collapsed && <SectionLabel>{t('nav.thisProject')}</SectionLabel>}
        {items.map(it => (
          <button key={it.k} onClick={it.onClick} title={it.label}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: collapsed ? '8px 0' : '7px 8px', marginBottom: '1px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              border: 'none', borderRadius: tokens.radius.sm, cursor: it.onClick ? 'pointer' : 'default',
              background: it.active ? 'var(--ds-background-selected, #DEEBFF)' : 'transparent',
              color: it.active ? tokens.iconInfo : tokens.textPrimary,
              fontSize: '12px', fontWeight: it.active ? 700 : 500, fontFamily: 'inherit',
            }}>
            <it.icon color={it.active ? tokens.iconInfo : tokens.textSubtle} />
            {!collapsed && <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>}
            {!collapsed && it.badge != null && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: typeof it.badge === 'string' ? tokens.iconInfo : tokens.textSubtle, background: typeof it.badge === 'string' ? 'rgba(76,154,255,0.12)' : tokens.bgNeutral, borderRadius: '999px', padding: '0 6px' }}>{it.badge}</span>
            )}
          </button>
        ))}

        {/* Projects summary (this chart) */}
        {!collapsed && (
          <>
            <SectionLabel style={{ marginTop: '16px' }}>{t('nav.projects')}</SectionLabel>
            <div style={{ padding: '7px 8px', borderRadius: tokens.radius.sm, background: 'var(--ds-background-selected, #DEEBFF)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: criticalCount > 0 ? tokens.iconWarning : tokens.iconSuccess, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{BRAND}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: tokens.textSubtle }}>{progress}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: tokens.bgNeutral, marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#0C66E4,#5E4DB2)' }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(c => !c)} aria-label="toggle nav" style={{
        height: 30, border: 'none', borderTop: `1px solid ${tokens.border}`, background: 'transparent',
        cursor: 'pointer', color: tokens.textSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
  );
}

function SectionLabel({ children, style }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 800, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.6px', padding: '4px 8px 8px', ...style }}>
      {children}
    </div>
  );
}

const ic = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
function TimelineIcon({ color }) { return <svg {...ic} stroke={color}><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="10" y2="18" /></svg>; }
function FlagIcon({ color }) { return <svg {...ic} stroke={color}><path d="M4 22V4a2 2 0 0 1 2-2h11l-2 5 2 5H6" /><line x1="4" y1="22" x2="4" y2="15" /></svg>; }
function ReportsIcon({ color }) { return <svg {...ic} stroke={color}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>; }
function UsersIcon({ color }) { return <svg {...ic} stroke={color}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></svg>; }
function LinkIcon({ color }) { return <svg {...ic} stroke={color}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>; }
