// src/jiraUtils.js

export function escapeJql(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/[(){}[\]~!]/g, c => `\\${c}`);
}

export function escapeKey(str) {
  return (str || '').replace(/[^a-zA-Z0-9-_]/g, '_');
}

const STATUS_PROGRESS = {
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

export function getGroupValue(issue, groupByField) {
  const f = issue.fields;
  switch (groupByField) {
    case 'epic': {
      if (f.issuetype?.name === 'Epic') return f.summary || issue.key;
      if (f.parent?.fields?.issuetype?.name === 'Epic') return f.parent.fields.summary || f.parent.key;
      if (f.customfield_10014) return f.customfield_10014;
      return 'Sem Epic';
    }
    case 'component':
      return f.components?.[0]?.name || 'Sem Componente';
    case 'sprint': {
      const sprint = f.customfield_10020;
      if (Array.isArray(sprint) && sprint.length > 0) return sprint[sprint.length - 1]?.name || 'Sem Sprint';
      return 'Sem Sprint';
    }
    case 'labels':
      return f.labels?.[0] || 'Sem Label';
    case 'fixVersions':
      return f.fixVersions?.[0]?.name || 'Sem Versão';
    case 'issuetype':
      return f.issuetype?.name || 'Unknown';
    default:
      return 'Sem Grupo';
  }
}

function formatDate(str) {
  if (!str) return new Date().toISOString().split('T')[0];
  return str.split('T')[0];
}

export function mapIssuesToTasks(issues, config, siteUrl) {
  return issues.map(issue => ({
    id: issue.key,
    name: issue.fields.summary,
    startDate: formatDate(issue.fields[config.startDateField] || issue.fields.created),
    endDate: formatDate(issue.fields[config.endDateField] || issue.fields.created),
    progress: statusToProgress(issue.fields.status?.name || ''),
    phase: getGroupValue(issue, config.groupByField),
    assigneeIds: issue.fields.assignee?.accountId ? [issue.fields.assignee.accountId] : [],
    jiraIssueKey: issue.key,
    isMilestone: issue.fields.issuetype?.name === 'Milestone',
    dependsOn: extractBlockedBy(issue.fields.issuelinks || []),
    status: issue.fields.status?.name || '',
    siteUrl: siteUrl || '',
  }));
}

export const JIRA_DEFAULT_CONFIG = {
  issueTypes: [],
  startDateField: 'start',
  endDateField: 'duedate',
  groupByField: 'epic',
};
