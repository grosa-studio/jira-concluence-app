export function escapeJql(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/[(){}[\]~!]/g, c => `\\${c}`);
}

export function isValidIssueKey(key) {
  return /^[A-Z][A-Z0-9]*-\d+$/.test((key || '').trim().toUpperCase());
}

export function formatIssueKey(key) {
  return (key || '').trim().toUpperCase();
}
