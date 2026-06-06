import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, avatarColor, initials } from '../tokens';
import { UserAvatar } from './UserAvatar';
import { taskDuration } from '../utils/duration';
import { useSettings } from '../contexts/settings';

// Resources view — load per assignee, computed from real tasks (count + total days).
export function GanttResources({ tasks, users = {} }) {
  const { t } = useTranslation();
  const { countWeekends } = useSettings();
  const dur = (x) => taskDuration(x.startDate, x.endDate, countWeekends);
  const leaf = tasks.filter(x => !x.isMilestone);
  const map = new Map();
  let unassigned = 0;
  leaf.forEach(x => {
    const ids = x.assigneeIds || [];
    if (!ids.length) { unassigned++; return; }
    ids.forEach(aid => {
      const e = map.get(aid) || { count: 0, days: 0 };
      e.count += 1; e.days += dur(x);
      map.set(aid, e);
    });
  });
  const rows = [...map.entries()].map(([aid, e]) => ({ aid, ...e, name: users[aid]?.displayName || aid })).sort((a, b) => b.days - a.days);
  const maxDays = Math.max(1, ...rows.map(r => r.days));

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: tokens.spacing[5], background: tokens.surfaceSunken }}>
      <h2 style={{ margin: `0 0 ${tokens.spacing[4]}`, fontFamily: '"Outfit","Inter",sans-serif', fontSize: '20px', fontWeight: 700, color: tokens.textPrimary }}>
        {t('nav.resources')}
      </h2>

      {rows.length === 0 ? (
        <div style={{ padding: tokens.spacing[5], textAlign: 'center', color: tokens.textSubtle, fontSize: '13px', background: tokens.surfaceRaised, border: `1px dashed ${tokens.border}`, borderRadius: tokens.radius.lg }}>
          {t('detail.none')} — {t('detail.assignees').toLowerCase()}
        </div>
      ) : (
        <div style={{ background: tokens.surfaceRaised, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.lg, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div key={r.aid} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`, borderBottom: i < rows.length - 1 ? `1px solid ${tokens.border}` : 'none' }}>
              {users[r.aid] ? <UserAvatar user={users[r.aid]} size={28} /> : (
                <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: avatarColor(r.aid), color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {initials(r.name)}
                </span>
              )}
              <span style={{ width: 180, flexShrink: 0, fontSize: '13px', fontWeight: 600, color: tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: tokens.bgNeutral, overflow: 'hidden' }}>
                <div style={{ width: `${(r.days / maxDays) * 100}%`, height: '100%', background: avatarColor(r.aid) }} />
              </div>
              <span style={{ width: 90, flexShrink: 0, textAlign: 'right', fontSize: '11px', fontWeight: 600, color: tokens.textSubtle }}>{r.days}d · {r.count}</span>
            </div>
          ))}
          {unassigned > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`, borderTop: `1px solid ${tokens.border}`, color: tokens.textSubtle, fontSize: '12px' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: tokens.bgNeutral, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>—</span>
              <span style={{ flex: 1 }}>{t('detail.none')}</span>
              <span style={{ fontWeight: 600 }}>{unassigned}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
