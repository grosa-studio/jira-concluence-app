export const STATUS_PROGRESS = {
  'To Do': 0, 'Open': 0, 'Backlog': 0, 'New': 0,
  'In Progress': 50, 'In Review': 40, 'In Development': 50, 'In Testing': 60,
  'Done': 100, 'Resolved': 100, 'Closed': 100,
};

export function statusToProgress(statusName) {
  return STATUS_PROGRESS[statusName] ?? 0;
}

export function extractBlockedBy(issuelinks) {
  if (!Array.isArray(issuelinks)) return [];
  return issuelinks
    .filter(l => l.type?.inward === 'is blocked by' || l.type?.outward === 'blocks')
    .map(l => l.inwardIssue?.key || l.outwardIssue?.key)
    .filter(Boolean);
}

export const GROUP_LABELS = {
  epic: 'Epic',
  component: 'Componente',
  sprint: 'Sprint',
  labels: 'Label',
  fixVersions: 'Fix Version',
  issuetype: 'Tipo de Issue',
};

export const JIRA_DEFAULT_CONFIG = {
  issueTypes: [],
  startDateField: 'start',
  endDateField: 'duedate',
  groupByField: 'epic',
};
