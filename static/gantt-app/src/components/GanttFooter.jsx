import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../tokens';
import { spanDuration } from '../utils/duration';
import { useSettings } from '../contexts/settings';

// Dark summary bar (ProBottomBar). The prototype's Liveblocks/presence section
// has no Forge equivalent, so this keeps the project metrics + save state.
const DARK = { bg: '#0B1426', divider: '#1F2937', sub: '#8B95A5', fg: '#D8DEE9', white: '#FFFFFF', green: '#39BE7C', red: '#FF6669', amber: '#E2B203' };

export function GanttFooter({ tasks, saveStatus }) {
  const { t } = useTranslation();

  const { countWeekends } = useSettings();
  const leaf = tasks.filter(x => !x.isMilestone);
  const totalDays = spanDuration(tasks, countWeekends);
  const criticalCount = tasks.filter(x => x.isCritical).length;
  const doneAvg = leaf.length ? Math.round(leaf.reduce((s, x) => s + (x.progress || 0), 0) / leaf.length) : 0;

  const saving = saveStatus === 'saving';
  const saveLabel = saving ? t('header.saving') : t('header.saved');

  return (
    <div style={{
      height: 30, flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: tokens.spacing[3],
      padding: `0 ${tokens.spacing[4]}`,
      borderTop: `1px solid ${DARK.divider}`,
      background: DARK.bg, color: DARK.sub,
      fontSize: '11px',
    }}>
      <Stat label={t('footer.critical')} value={criticalCount} dot={DARK.red} valueColor={DARK.red} />
      <Sep />
      <Stat label={t('footer.totalDuration')} value={`${totalDays}d`} valueColor={DARK.white} />
      <Sep />
      <Stat label={t('footer.done')} value={`${doneAvg}%`} valueColor={DARK.green} />
      <div style={{ flex: 1 }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: saving ? DARK.amber : DARK.green }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: saving ? DARK.amber : DARK.green }} />
        {saveLabel}
      </span>
    </div>
  );
}

function Stat({ label, value, dot, valueColor }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
      <span style={{ color: DARK.sub }}>{label}</span>
      <strong style={{ fontWeight: 700, color: valueColor || DARK.white }}>{value}</strong>
    </span>
  );
}

function Sep() {
  return <span style={{ width: 1, height: 12, background: DARK.divider }} />;
}
