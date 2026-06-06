import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, PHASE_COLORS } from '../tokens';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Welcome / empty state — mirrors the prototype: Home (3 entry options) →
// template gallery, or → paste-CSV import. Shown in the Confluence macro when
// there are no tasks.
export function GanttEmptyState({ onBlank, onTemplate, onImport }) {
  const { t } = useTranslation();
  const [view, setView] = useState('home');

  return (
    <div style={{
      flex: 1, overflow: 'auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px', background: tokens.surfaceSunken,
    }}>
      <div style={{ width: '100%', maxWidth: 920 }}>
        {view === 'home' && <HomeView t={t} setView={setView} onBlank={onBlank} />}
        {view === 'templates' && <TemplatesView t={t} onTemplate={onTemplate} onBack={() => setView('home')} />}
        {view === 'import' && <ImportView t={t} onImport={onImport} onBack={() => setView('home')} />}
      </div>
    </div>
  );
}

function HomeView({ t, setView, onBlank }) {
  const options = [
    { id: 'blank', accent: PHASE_COLORS[0], title: t('empty.blank'), desc: t('empty.blankDesc'), icon: BlankIcon, onClick: onBlank },
    { id: 'template', accent: PHASE_COLORS[1], title: t('empty.fromTemplate'), desc: null, badge: '6', icon: SparkIcon, onClick: () => setView('templates') },
    { id: 'import', accent: PHASE_COLORS[2], title: t('empty.import'), desc: 'CSV', icon: UploadIcon, onClick: () => setView('import') },
  ];
  return (
    <div>
      <h2 style={{ margin: 0, fontFamily: '"Outfit","Inter",sans-serif', fontSize: '24px', fontWeight: 700, color: tokens.textPrimary, letterSpacing: '-0.4px' }}>
        {t('empty.title')}
      </h2>
      <p style={{ margin: '8px 0 24px', fontSize: '14px', color: tokens.textSubtle, maxWidth: 560 }}>
        {t('empty.subtitle')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: tokens.spacing[4] }}>
        {options.map(opt => (
          <button key={opt.id} className="gantt-empty-card" onClick={opt.onClick}
            style={{
              textAlign: 'left', padding: tokens.spacing[4], cursor: 'pointer',
              border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg,
              background: tokens.surfaceRaised, font: 'inherit',
              display: 'flex', flexDirection: 'column', gap: tokens.spacing[3],
            }}>
            <div style={{ width: 40, height: 40, borderRadius: tokens.radius.md, background: `${opt.accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: opt.accent }}>
              <opt.icon />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: tokens.textPrimary }}>{opt.title}</span>
                {opt.badge && <span style={{ fontSize: '10px', fontWeight: 700, color: opt.accent, background: `${opt.accent}1A`, borderRadius: '999px', padding: '1px 7px' }}>{opt.badge}</span>}
              </div>
              {opt.desc && <div style={{ fontSize: '12px', color: tokens.textSubtle, lineHeight: 1.4 }}>{opt.desc}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const GALLERY = [
  { id: 'launch', palette: [1, 2, 3] },
  { id: 'sprint', palette: [0, 1] },
  { id: 'roadmap', palette: [0, 2, 3] },
  { id: 'marketing', palette: [4, 5, 6] },
  { id: 'onboarding', palette: [3, 9, 1] },
  { id: 'event', palette: [8, 6, 5] },
];

function TemplatesView({ t, onTemplate, onBack }) {
  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 style={{ margin: '8px 0 20px', fontFamily: '"Outfit","Inter",sans-serif', fontSize: '20px', fontWeight: 700, color: tokens.textPrimary }}>
        {t('empty.fromTemplate')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: tokens.spacing[4] }}>
        {GALLERY.map(tpl => (
          <button key={tpl.id} className="gantt-empty-card" onClick={() => onTemplate(tpl.id)}
            style={{
              textAlign: 'left', padding: tokens.spacing[4], cursor: 'pointer',
              border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg,
              background: tokens.surfaceRaised, font: 'inherit',
              display: 'flex', flexDirection: 'column', gap: tokens.spacing[3],
            }}>
            <Thumbnail palette={tpl.palette.map(i => PHASE_COLORS[i])} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: tokens.textPrimary, marginBottom: '4px' }}>
                {t(`empty.tpl${CAP(tpl.id)}`)}
              </div>
              <div style={{ fontSize: '12px', color: tokens.textSubtle, lineHeight: 1.4 }}>
                {t(`empty.tpl${CAP(tpl.id)}Desc`)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ImportView({ t, onImport, onBack }) {
  const [text, setText] = useState('');
  const rows = text.split('\n').map(l => l.trim()).filter(Boolean).length;
  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 style={{ margin: '8px 0 6px', fontFamily: '"Outfit","Inter",sans-serif', fontSize: '20px', fontWeight: 700, color: tokens.textPrimary }}>
        {t('empty.import')}
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: '13px', color: tokens.textSubtle }}>
        {t('empty.importHint')}
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={'Customer research, 2026-06-01, 2026-06-10\nUser interviews, 2026-06-05, 2026-06-14'}
        style={{
          width: '100%', minHeight: 140, padding: tokens.spacing[3],
          border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md,
          fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6,
          color: tokens.textPrimary, background: tokens.surfaceRaised, outline: 'none', resize: 'vertical',
        }}
      />
      <button onClick={() => { if (rows) onImport(text); }} disabled={!rows}
        style={{
          marginTop: tokens.spacing[3], padding: '8px 16px', cursor: rows ? 'pointer' : 'not-allowed',
          background: rows ? tokens.focus : tokens.bgNeutral, color: rows ? '#fff' : tokens.textSubtle,
          border: 'none', borderRadius: tokens.radius.md, fontSize: '13px', fontWeight: 700,
        }}>
        {t('modal.confirm')}{rows ? ` · ${rows}` : ''}
      </button>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label="back" style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: 'transparent', border: 'none', cursor: 'pointer',
      color: tokens.iconInfo, fontSize: '16px', fontWeight: 700, padding: '4px 0',
    }}>
      ←
    </button>
  );
}

// Tiny gantt preview rendered from the template palette.
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

function BlankIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
}
function SparkIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.7 5L19 9.7 13.7 11.4 12 16.7 10.3 11.4 5 9.7l5.3-1.7L12 3z" /></svg>;
}
function UploadIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
}
