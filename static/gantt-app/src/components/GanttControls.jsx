import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, STATUS_ORDER, STATUS_COLORS } from '../tokens';

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Second toolbar row: group-by, sort, status filter, task search.
// Ported from the prototype BoardToolbar (group/sort/filter) + ProTopBar search.
export function GanttControls({ groupBy, onGroupBy, sortBy, onSortBy, filterStatuses, onFilterStatuses, query, onQuery }) {
  const { t } = useTranslation();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [filterOpen]);

  const toggleStatus = (s) => {
    const next = new Set(filterStatuses);
    if (next.has(s)) next.delete(s); else next.add(s);
    onFilterStatuses(next);
  };

  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: tokens.spacing[2],
      height: 42, padding: `0 ${tokens.spacing[3]}`,
      borderBottom: `1px solid ${tokens.border}`, background: tokens.surfaceRaised,
    }}>
      {/* Group by */}
      <div style={chipStyle}>
        <Glyph><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></Glyph>
        <select value={groupBy} onChange={e => onGroupBy(e.target.value)} style={selStyle} aria-label={t('extras.byPhase')}>
          <option value="phase">{t('extras.byPhase')}</option>
          <option value="status">{t('extras.byStatus')}</option>
          <option value="assignee">{t('extras.byAssignee')}</option>
        </select>
      </div>

      {/* Sort */}
      <div style={chipStyle}>
        <Glyph><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></Glyph>
        <select value={sortBy} onChange={e => onSortBy(e.target.value)} style={selStyle} aria-label="sort">
          <option value="manual">—</option>
          <option value="start">{t('detail.startDate')}</option>
          <option value="end">{t('detail.endDate')}</option>
          <option value="name">{t('detail.name')}</option>
          <option value="progress">{t('detail.progress')}</option>
        </select>
      </div>

      {/* Status filter */}
      <div style={{ position: 'relative' }} ref={filterRef}>
        <button onClick={() => setFilterOpen(o => !o)} style={{
          ...chipStyle, cursor: 'pointer', gap: '5px',
          color: filterStatuses.size ? tokens.iconInfo : tokens.textSubtle,
          borderColor: filterStatuses.size ? tokens.iconInfo : tokens.border,
        }}>
          <Glyph><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Glyph>
          {filterStatuses.size > 0 && <span style={{ fontSize: '11px', fontWeight: 700 }}>{filterStatuses.size}</span>}
        </button>
        {filterOpen && (
          <div style={{
            position: 'absolute', top: '112%', left: 0, zIndex: 30, minWidth: 170,
            background: tokens.surfaceRaised, border: `1px solid ${tokens.border}`,
            borderRadius: tokens.radius.md, padding: '4px', boxShadow: tokens.shadow?.md || '0 4px 12px rgba(9,30,66,0.15)',
          }}>
            {STATUS_ORDER.map(s => {
              const c = STATUS_COLORS[s];
              return (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', fontSize: '13px', color: tokens.textPrimary, borderRadius: tokens.radius.sm }}>
                  <input type="checkbox" checked={filterStatuses.has(s)} onChange={() => toggleStatus(s)} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.bar }} />
                  {t(`extras.st${CAP(s)}`)}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <input
        value={query}
        onChange={e => onQuery(e.target.value)}
        placeholder={t('extras.searchTasks')}
        style={{
          height: 28, width: 220, maxWidth: '45%', padding: '0 10px',
          border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm,
          background: tokens.surfaceSunken, color: tokens.textPrimary, fontSize: '12px', outline: 'none',
        }}
      />
    </div>
  );
}

function Glyph({ children }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  );
}

const chipStyle = {
  display: 'flex', alignItems: 'center', gap: '6px',
  height: 28, padding: '0 8px',
  border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.sm,
  background: tokens.surfaceRaised, color: tokens.textSubtle,
};

const selStyle = {
  border: 'none', background: 'transparent', color: tokens.textPrimary,
  fontSize: '12px', fontWeight: 600, outline: 'none', cursor: 'pointer',
};
