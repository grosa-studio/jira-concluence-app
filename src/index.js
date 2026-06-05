import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs as storage } from '@forge/kvs';
import {
  escapeJql, escapeKey, mapIssuesToTasks, JIRA_DEFAULT_CONFIG,
} from './jiraUtils.js';

const resolver = new Resolver();

const storageKey = (localId) => `gantt-v3-${localId}`;

resolver.define('getTasks', async ({ context }) => {
  const { localId } = context;
  try {
    const data = await storage.get(storageKey(localId));
    if (data) return { success: true, data };
  } catch (err) {
    console.error('getTasks storage error:', err.message);
  }
  return {
    success: true,
    data: {
      tasks: [],
      phases: [
        { id: 'phase-1', name: 'Discovery', color: '#4C9AFF' },
        { id: 'phase-2', name: 'Design', color: '#8777D9' },
        { id: 'phase-3', name: 'Engineering', color: '#36B37E' },
      ],
      meta: { projectStart: '', projectEnd: '' },
    },
  };
});

resolver.define('saveTasks', async ({ payload, context }) => {
  const { localId } = context;
  const { data } = payload;

  if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.phases)) {
    return { success: false, error: 'Invalid payload structure', code: 400 };
  }

  try {
    await storage.set(storageKey(localId), data);
    return { success: true };
  } catch (err) {
    console.error('saveTasks error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});

resolver.define('searchUsers', async ({ payload }) => {
  const query = payload?.query || '';
  if (!query.trim()) return { success: true, data: [] };

  try {
    const res = await api.asUser().requestJira(
      route`/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=20`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return { success: false, error: 'User search failed', code: res.status };
    const users = await res.json();
    return {
      success: true,
      data: users.map(u => ({
        accountId: u.accountId,
        displayName: u.displayName,
        avatarUrl: null, // not used — initials only (CSP)
      })),
    };
  } catch (err) {
    console.error('searchUsers error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});

resolver.define('searchJiraIssues', async ({ payload }) => {
  const query = escapeJql(payload?.query || '');
  const project = payload?.project ? `project = "${escapeJql(payload.project)}" AND ` : '';
  if (!query && !project) return { success: true, data: [] };

  const jql = `${project}text ~ "${query}" ORDER BY updated DESC`;

  try {
    const res = await api.asUser().requestJira(route`/rest/api/3/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jql, maxResults: 20, fields: ['summary', 'status', 'issuetype', 'assignee'] }),
    });
    if (!res.ok) return { success: false, error: 'Jira search failed', code: res.status };
    const result = await res.json();
    return {
      success: true,
      data: (result.issues || []).map(i => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status?.name,
        issueType: i.fields.issuetype?.name,
      })),
    };
  } catch (err) {
    console.error('searchJiraIssues error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});

resolver.define('getProjectConfig', async ({ payload }) => {
  const { projectKey } = payload;
  if (!projectKey) return { success: false, error: 'projectKey required', code: 400 };
  try {
    const saved = await storage.get(`gantt-jira-config-${escapeKey(projectKey)}`);
    return { success: true, data: saved || JIRA_DEFAULT_CONFIG };
  } catch (err) {
    console.error('getProjectConfig error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});

resolver.define('saveProjectConfig', async ({ payload }) => {
  const { projectKey, config } = payload;
  if (!projectKey || !config) return { success: false, error: 'projectKey and config required', code: 400 };
  try {
    await storage.set(`gantt-jira-config-${escapeKey(projectKey)}`, config);
    return { success: true };
  } catch (err) {
    console.error('saveProjectConfig error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});

export const handler = resolver.getDefinitions();
