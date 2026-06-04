export const PHASE_COLORS = [
  '#4C9AFF',
  '#36B37E',
  '#8777D9',
  '#FF8B00',
  '#00B8D9',
  '#FF5630',
];

export const tokens = {
  surface:       'var(--ds-surface, #FFFFFF)',
  surfaceRaised: 'var(--ds-surface-raised, #FFFFFF)',
  surfaceSunken: 'var(--ds-surface-sunken, #F4F5F7)',
  surfaceOverlay:'var(--ds-surface-overlay, #FFFFFF)',
  border:        'var(--ds-border, #DFE1E6)',
  borderBold:    'var(--ds-border-bold, #8590A2)',
  textPrimary:   'var(--ds-text, #172B4D)',
  textSubtle:    'var(--ds-text-subtle, #6B778C)',
  textDisabled:  'var(--ds-text-disabled, #A5ADBA)',
  iconDanger:    'var(--ds-icon-danger, #FF5630)',
  iconSuccess:   'var(--ds-icon-success, #36B37E)',
  iconWarning:   'var(--ds-icon-warning, #FFAB00)',
  iconInfo:      'var(--ds-icon-information, #4C9AFF)',
  bgDanger:      'var(--ds-background-danger, #FFEBE6)',
  bgSuccess:     'var(--ds-background-success, #E3FCEF)',
  bgNeutral:     'var(--ds-background-neutral, #F4F5F7)',
  focus:         'var(--ds-border-focused, #4C9AFF)',
  font:          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  radius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px' },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.10)',
    lg: '0 8px 28px rgba(0,0,0,0.14)',
  },
};

export const GANTT = {
  ROW_HEIGHT: 52,
  PHASE_HEADER_HEIGHT: 40,
  TIMELINE_HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 320,
  DETAIL_PANEL_WIDTH: 340,
};

export function phaseColor(index) {
  return PHASE_COLORS[index % PHASE_COLORS.length];
}

export function avatarColor(accountId) {
  if (!accountId) return PHASE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    hash = accountId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PHASE_COLORS[Math.abs(hash) % PHASE_COLORS.length];
}

export function initials(displayName) {
  if (!displayName) return '?';
  return displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
