// Product brand name (shown in header / chrome)
export const BRAND = 'Gantera';

// ADS group palette (matches the Ganttera prototype hues)
export const PHASE_COLORS = [
  '#0C66E4', // blue       (Engineering)
  '#5E4DB2', // purple     (Discovery)
  '#1D7F8C', // teal       (Design)
  '#1F845A', // green      (Launch)
  '#B65C02', // orange
  '#C9372C', // red
  '#943D73', // magenta
  '#5B7F24', // lime
  '#946F00', // gold
  '#227D9B', // cyan
  '#CD519D', // rose
  '#4C6EF5', // indigo
];

// Status palette (raw hex accent colors — theme-agnostic, like PHASE_COLORS)
export const STATUS_ORDER = ['notStarted', 'inProgress', 'atRisk', 'blocked', 'done'];
export const STATUS_COLORS = {
  notStarted: { bar: '#8590A2', bg: 'rgba(133,144,162,0.14)', fg: '#44546F' },
  inProgress: { bar: '#0C66E4', bg: 'rgba(12,102,228,0.12)',  fg: '#0055CC' },
  atRisk:     { bar: '#E2B203', bg: 'rgba(226,178,3,0.16)',   fg: '#946F00' },
  blocked:    { bar: '#C9372C', bg: 'rgba(201,55,44,0.12)',   fg: '#AE2A19' },
  done:       { bar: '#1F845A', bg: 'rgba(31,132,90,0.14)',   fg: '#216E4E' },
};

// Map either our enum or a raw Jira status name to a status enum key.
// Jira tasks carry the raw status string (e.g. "In Progress") — this keeps
// colors/grouping correct in both modes. Returns 'notStarted' as fallback.
const STATUS_ALIASES = {
  'to do': 'notStarted', open: 'notStarted', backlog: 'notStarted', new: 'notStarted',
  'in progress': 'inProgress', 'in review': 'inProgress', 'in development': 'inProgress', 'in testing': 'inProgress',
  blocked: 'blocked', 'at risk': 'atRisk',
  done: 'done', resolved: 'done', closed: 'done',
};
export function normalizeStatus(s) {
  if (STATUS_COLORS[s]) return s;
  return STATUS_ALIASES[String(s || '').toLowerCase()] || 'notStarted';
}

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
  // Critical path — strong coral (raw hex, used in SVG gradient stops)
  critical:      '#E5484D',
  criticalDeep:  '#C9372C',
  criticalLight: '#FF6669',
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
  ROW_HEIGHT: 44,
  PHASE_HEADER_HEIGHT: 34,
  TIMELINE_HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 360,
  DETAIL_PANEL_WIDTH: 340,
};

export function phaseColor(index) {
  const i = ((index % PHASE_COLORS.length) + PHASE_COLORS.length) % PHASE_COLORS.length;
  return PHASE_COLORS[i];
}

// Lighten a hex color by pct (0-100). Used to build the vertical gradient
// on task bars (lighter top → base bottom), matching the prototype.
export function lighten(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  r = Math.min(255, Math.round(r + (255 - r) * pct / 100));
  g = Math.min(255, Math.round(g + (255 - g) * pct / 100));
  b = Math.min(255, Math.round(b + (255 - b) * pct / 100));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
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
