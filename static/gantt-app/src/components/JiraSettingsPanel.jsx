import React, { useState } from 'react';
import { tokens } from '../tokens';
import { GROUP_LABELS } from '../utils/jiraIssueMapping';

const GROUP_OPTIONS = Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label }));

export function JiraSettingsPanel({ config, issueTypes, dateFields, onSave, onClose }) {
  const [local, setLocal] = useState({ ...config });

  const toggleType = (name) => {
    setLocal(prev => {
      const cur = prev.issueTypes || [];
      const next = cur.includes(name) ? cur.filter(t => t !== name) : [...cur, name];
      return { ...prev, issueTypes: next };
    });
  };

  const isTypeSelected = (name) =>
    local.issueTypes.length === 0 || local.issueTypes.includes(name);

  return (
    <div className="detail-panel open" style={{ padding: tokens.spacing[4] }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[4] }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: tokens.textPrimary }}>
          ⚙ Configurações do Gantt
        </span>
        <button onClick={onClose} aria-label="Fechar"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: tokens.textSubtle, lineHeight: 1 }}>
          ×
        </button>
      </div>

      {/* Issue types */}
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <label style={labelStyle}>Tipos de Issue</label>
        <p style={{ fontSize: '11px', color: tokens.textSubtle, margin: `0 0 ${tokens.spacing[2]}` }}>
          Nenhum selecionado = todos os tipos
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {issueTypes.map(it => (
            <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: tokens.textPrimary }}>
              <input type="checkbox" checked={isTypeSelected(it.name)} onChange={() => toggleType(it.name)} />
              {it.name}
            </label>
          ))}
        </div>
      </div>

      {/* Start date field */}
      <div style={{ marginBottom: tokens.spacing[3] }}>
        <label style={labelStyle}>Campo de Início</label>
        <select value={local.startDateField}
          onChange={e => setLocal(prev => ({ ...prev, startDateField: e.target.value }))}
          style={inputStyle}>
          {dateFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* End date field */}
      <div style={{ marginBottom: tokens.spacing[3] }}>
        <label style={labelStyle}>Campo de Fim</label>
        <select value={local.endDateField}
          onChange={e => setLocal(prev => ({ ...prev, endDateField: e.target.value }))}
          style={inputStyle}>
          {dateFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Group by */}
      <div style={{ marginBottom: tokens.spacing[5] }}>
        <label style={labelStyle}>Agrupar por</label>
        <select value={local.groupByField}
          onChange={e => setLocal(prev => ({ ...prev, groupByField: e.target.value }))}
          style={inputStyle}>
          {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
        <button onClick={() => onSave(local)} style={primaryBtn}>Salvar</button>
        <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: tokens.textSubtle, textTransform: 'uppercase',
  letterSpacing: '0.6px', marginBottom: tokens.spacing[1],
};
const inputStyle = {
  width: '100%', padding: '7px 10px',
  border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md,
  fontSize: '13px', color: tokens.textPrimary,
  background: tokens.surfaceRaised,
};
const primaryBtn = {
  padding: '8px 20px', borderRadius: tokens.radius.md, border: 'none',
  background: 'var(--ds-background-brand-bold, #0052CC)', color: '#fff',
  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
};
const secondaryBtn = {
  padding: '8px 20px', borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.border}`,
  background: 'transparent', color: tokens.textPrimary,
  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};
