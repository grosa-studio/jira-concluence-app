import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, PHASE_COLORS } from '../tokens';

// Welcome / empty state shown in the Confluence macro when there are no tasks.
// Mirrors the prototype's entry cards: start blank, or seed from a sample.
export function GanttEmptyState({ onBlank, onTemplate }) {
  const { t } = useTranslation();

  const cards = [
    {
      id: 'blank', accent: PHASE_COLORS[0],
      title: t('empty.blank'), desc: t('empty.blankDesc'),
      palette: [PHASE_COLORS[0], PHASE_COLORS[0]],
      onClick: onBlank,
    },
    {
      id: 'launch', accent: PHASE_COLORS[1],
      title: t('empty.tplLaunch'), desc: t('empty.tplLaunchDesc'),
      palette: [PHASE_COLORS[1], PHASE_COLORS[2], PHASE_COLORS[3]],
      onClick: () => onTemplate('launch'),
    },
    {
      id: 'sprint', accent: PHASE_COLORS[0],
      title: t('empty.tplSprint'), desc: t('empty.tplSprintDesc'),
      palette: [PHASE_COLORS[0], PHASE_COLORS[1]],
      onClick: () => onTemplate('sprint'),
    },
    {
      id: 'roadmap', accent: PHASE_COLORS[2],
      title: t('empty.tplRoadmap'), desc: t('empty.tplRoadmapDesc'),
      palette: [PHASE_COLORS[0], PHASE_COLORS[2], PHASE_COLORS[3]],
      onClick: () => onTemplate('roadmap'),
    },
    {
      id: 'marketing', accent: PHASE_COLORS[4],
      title: t('empty.tplMarketing'), desc: t('empty.tplMarketingDesc'),
      palette: [PHASE_COLORS[4], PHASE_COLORS[5], PHASE_COLORS[6]],
      onClick: () => onTemplate('marketing'),
    },
    {
      id: 'onboarding', accent: PHASE_COLORS[3],
      title: t('empty.tplOnboarding'), desc: t('empty.tplOnboardingDesc'),
      palette: [PHASE_COLORS[3], PHASE_COLORS[9], PHASE_COLORS[1]],
      onClick: () => onTemplate('onboarding'),
    },
    {
      id: 'event', accent: PHASE_COLORS[8],
      title: t('empty.tplEvent'), desc: t('empty.tplEventDesc'),
      palette: [PHASE_COLORS[8], PHASE_COLORS[6], PHASE_COLORS[5]],
      onClick: () => onTemplate('event'),
    },
  ];

  return (
    <div style={{
      flex: 1, overflow: 'auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px', background: tokens.surfaceSunken,
    }}>
      <div style={{ width: '100%', maxWidth: 920 }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: tokens.textPrimary, letterSpacing: '-0.4px' }}>
          {t('empty.title')}
        </h2>
        <p style={{ margin: '8px 0 24px', fontSize: '14px', color: tokens.textSubtle, maxWidth: 560 }}>
          {t('empty.subtitle')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: tokens.spacing[4] }}>
          {cards.map(c => (
            <button key={c.id} className="gantt-empty-card" onClick={c.onClick}
              style={{
                textAlign: 'left', padding: tokens.spacing[4], cursor: 'pointer',
                border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg,
                background: tokens.surfaceRaised, font: 'inherit',
                display: 'flex', flexDirection: 'column', gap: tokens.spacing[3],
              }}>
              <Thumbnail palette={c.palette} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: tokens.textPrimary, marginBottom: '4px' }}>
                  {c.title}
                </div>
                <div style={{ fontSize: '12px', color: tokens.textSubtle, lineHeight: 1.4 }}>
                  {c.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tiny gantt preview rendered from the card palette.
function Thumbnail({ palette }) {
  const bars = [
    { x: 4, w: 34, c: 0 },
    { x: 22, w: 30, c: 1 % palette.length },
    { x: 40, w: 40, c: 2 % palette.length },
    { x: 14, w: 26, c: 0 },
  ];
  return (
    <div style={{
      height: 64, borderRadius: tokens.radius.md, background: tokens.surfaceSunken,
      border: `1px solid ${tokens.border}`, position: 'relative', overflow: 'hidden',
    }}>
      {bars.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${b.x}%`, width: `${b.w}%`,
          top: 8 + i * 13, height: 8, borderRadius: 4,
          background: palette[b.c] || palette[0],
        }} />
      ))}
      <div style={{ position: 'absolute', left: '46%', top: 0, bottom: 0, width: 1.5, background: tokens.iconDanger, opacity: 0.5 }} />
    </div>
  );
}
