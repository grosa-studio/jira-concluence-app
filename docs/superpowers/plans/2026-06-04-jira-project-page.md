# Jira Project Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Gantt as a native tab in Jira projects (`jira:projectPage`), pulling real Jira issues as tasks, with configurable grouping/field mapping and explicit "Salvar no Jira" editing.

**Architecture:** Same Forge app + resource, new manifest module. Frontend detects Jira context via `view.getContext()` and branches into Jira mode (issues via JQL) vs Confluence mode (current storage). New hooks `useJiraData` and `useJiraEdit` own the Jira data layer; existing components (GanttSidebar, GanttTimeline, CPM) are reused unchanged.

**Tech Stack:** Atlassian Forge (nodejs22), React 18 + Vite, @forge/kvs, @forge/bridge, date-fns, i18next, Vitest.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `manifest.yml` | Modify | Add `jira:projectPage` module + `write:jira-work` scope |
| `src/index.js` | Modify | Add 6 new resolvers + utility functions |
| `static/gantt-app/src/hooks/useJiraData.js` | Create | Fetch config + issues + mapping |
| `static/gantt-app/src/hooks/useJiraEdit.js` | Create | Pending edits state + saveToJira() |
| `static/gantt-app/src/components/JiraSettingsPanel.jsx` | Create | Settings UI (types, date fields, grouping) |
| `static/gantt-app/src/components/JiraEditPanel.jsx` | Create | Edit panel with "Salvar no Jira" button |
| `static/gantt-app/src/App.jsx` | Modify | Context detection + Jira mode branch |
| `static/gantt-app/src/utils/jiraIssueMapping.js` | Create | Pure mapping functions (testable) |
| `static/gantt-app/src/utils/jiraIssueMapping.test.js` | Create | Unit tests for mapping functions |

---

## Task 1: Manifest — Add jira:projectPage module and write:jira-work scope

**Files:**
- Modify: `manifest.yml`

- [ ] **Step 1: Update manifest.yml**

Replace the full content of `manifest.yml`:

```yaml
permissions:
  scopes:
    - read:confluence-props
    - write:confluence-props
    - read:confluence-content.summary
    - storage:app
    - read:jira-work
    - write:jira-work
    - read:jira-user

modules:
  macro:
    - key: responsive-gantt-macro
      resource: main
      resolver:
        function: resolver
      title: Gantt
      description: Enterprise Gantt chart for Confluence — phases, critical path, Jira integration.
      parameters:
        - key: tasksJson
          type: string
          defaultValue: "[]"

  jira:projectPage:
    - key: gantt-jira-project-page
      resource: main
      resolver:
        function: resolver
      title: Gantt
      description: Gantt chart for your Jira project — issues, critical path, timeline.

  function:
    - key: resolver
      handler: index.handler

resources:
  - key: main
    path: static/gantt-app/dist

app:
  id: ari:cloud:ecosystem::app/ee93d8d1-e332-4275-b266-e8a75ebfeede
  runtime:
    name: nodejs22.x
```

- [ ] **Step 2: Verify lint passes**

```bash
forge lint
```
Expected: `No issues found.`

- [ ] **Step 3: Commit**

```bash
git add manifest.yml
git commit -m "feat(jira): add jira:projectPage module and write:jira-work scope"
```

---

## Task 2: Backend utility functions + tests

**Files:**
- Create: `src/jiraUtils.js` (backend-only utilities for mapping)

The resolver file `src/index.js` will import these. Keeping them separate makes the resolver readable.

- [ ] **Step 1: Create `src/jiraUtils.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/jiraUtils.js
git commit -m "feat(jira): add backend utility functions (mapping, grouping, status)"
```

---

## Task 3: Backend — Config resolvers

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Update imports in `src/index.js`**

Replace the first 4 lines:

```js
import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs as storage } from '@forge/kvs';
import {
  escapeJql, escapeKey, mapIssuesToTasks, JIRA_DEFAULT_CONFIG,
  getGroupValue, statusToProgress, extractBlockedBy,
} from './jiraUtils.js';
```

- [ ] **Step 2: Add `escapeJql` removal from index.js**

Remove the existing `escapeJql` function from `src/index.js` (lines 10-19 in the current file) since it now comes from `jiraUtils.js`. The `storageKey` function also changes:

Replace:
```js
function escapeJql(str) { ... }
const storageKey = (localId) => `gantt-v3-${localId}`;
```

With:
```js
const storageKey = (localId) => `gantt-v3-${localId}`;
```

- [ ] **Step 3: Add config resolvers after the existing `searchJiraIssues` resolver**

```js
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
```

- [ ] **Step 4: Verify lint**

```bash
forge lint
```
Expected: `No issues found.`

- [ ] **Step 5: Commit**

```bash
git add src/index.js
git commit -m "feat(jira): add getProjectConfig and saveProjectConfig resolvers"
```

---

## Task 4: Backend — Metadata resolvers

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Add issue types resolver**

```js
resolver.define('getProjectIssueTypes', async ({ payload }) => {
  const { projectKey } = payload;
  if (!projectKey) return { success: false, error: 'projectKey required', code: 400 };
  try {
    const res = await api.asUser().requestJira(
      route`/rest/api/3/project/${projectKey}/statuses`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return { success: false, error: 'Failed to fetch issue types', code: res.status };
    const data = await res.json();
    // Each entry is an issue type with its statuses
    const types = data.map(it => ({ id: it.id, name: it.name }));
    return { success: true, data: types };
  } catch (err) {
    console.error('getProjectIssueTypes error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});
```

- [ ] **Step 2: Add date fields resolver**

```js
resolver.define('getProjectDateFields', async ({ payload }) => {
  try {
    const res = await api.asUser().requestJira(
      route`/rest/api/3/field`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return { success: false, error: 'Failed to fetch fields', code: res.status };
    const fields = await res.json();
    const dateFields = fields
      .filter(f => f.schema && ['date', 'datetime'].includes(f.schema.type))
      .map(f => ({ id: f.id, name: f.name, type: f.schema.type }));
    return { success: true, data: dateFields };
  } catch (err) {
    console.error('getProjectDateFields error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/index.js
git commit -m "feat(jira): add getProjectIssueTypes and getProjectDateFields resolvers"
```

---

## Task 5: Backend — Issues + Update resolvers

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Add getProjectIssues resolver**

```js
resolver.define('getProjectIssues', async ({ payload }) => {
  const { projectKey, config: cfg, siteUrl } = payload;
  if (!projectKey) return { success: false, error: 'projectKey required', code: 400 };

  const config = cfg || JIRA_DEFAULT_CONFIG;
  const selectedTypes = config.issueTypes || [];

  const typeFilter = selectedTypes.length > 0
    ? `AND issuetype in (${selectedTypes.map(t => `"${escapeJql(t)}"`).join(',')}) `
    : '';

  const jql = `project = "${escapeJql(projectKey)}" ${typeFilter}ORDER BY created ASC`;

  const fields = [
    'summary', 'status', 'assignee', 'issuetype', 'duedate', 'created',
    config.startDateField, config.endDateField,
    'issuelinks', 'parent', 'components', 'labels', 'fixVersions',
    'customfield_10014', // epic link (classic)
    'customfield_10020', // sprint
  ].filter((f, i, arr) => f && arr.indexOf(f) === i); // deduplicate

  const allIssues = [];
  let startAt = 0;
  const maxResults = 100;

  try {
    while (true) {
      const res = await api.asUser().requestJira(route`/rest/api/3/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ jql, startAt, maxResults, fields }),
      });
      if (!res.ok) return { success: false, error: 'Jira search failed', code: res.status };
      const data = await res.json();
      allIssues.push(...(data.issues || []));
      if (startAt + maxResults >= (data.total || 0)) break;
      startAt += maxResults;
    }
    return { success: true, data: mapIssuesToTasks(allIssues, config, siteUrl) };
  } catch (err) {
    console.error('getProjectIssues error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});
```

- [ ] **Step 2: Add updateJiraIssue resolver**

```js
resolver.define('updateJiraIssue', async ({ payload }) => {
  const { issueKey, fields } = payload;
  if (!issueKey || !fields) return { success: false, error: 'issueKey and fields required', code: 400 };
  try {
    const res = await api.asUser().requestJira(
      route`/rest/api/3/issue/${issueKey}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ fields }),
      }
    );
    // Jira PUT /issue returns 204 No Content on success
    return { success: res.ok };
  } catch (err) {
    console.error('updateJiraIssue error:', err.message);
    return { success: false, error: 'Internal error', code: 500 };
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/index.js
git commit -m "feat(jira): add getProjectIssues and updateJiraIssue resolvers"
```

---

## Task 6: Frontend — jiraIssueMapping utils + tests

**Files:**
- Create: `static/gantt-app/src/utils/jiraIssueMapping.js`
- Create: `static/gantt-app/src/utils/jiraIssueMapping.test.js`

These are pure functions mirroring the backend logic, used by `useJiraData` to display pending edits before saving.

- [ ] **Step 1: Create `static/gantt-app/src/utils/jiraIssueMapping.js`**

```js
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
```

- [ ] **Step 2: Create `static/gantt-app/src/utils/jiraIssueMapping.test.js`**

```js
import { describe, test, expect } from 'vitest';
import { statusToProgress, extractBlockedBy, STATUS_PROGRESS } from './jiraIssueMapping';

describe('statusToProgress', () => {
  test('maps To Do to 0', () => {
    expect(statusToProgress('To Do')).toBe(0);
  });
  test('maps Done to 100', () => {
    expect(statusToProgress('Done')).toBe(100);
  });
  test('maps In Progress to 50', () => {
    expect(statusToProgress('In Progress')).toBe(50);
  });
  test('returns 0 for unknown status', () => {
    expect(statusToProgress('Custom Status XYZ')).toBe(0);
  });
  test('returns 0 for empty string', () => {
    expect(statusToProgress('')).toBe(0);
  });
});

describe('extractBlockedBy', () => {
  test('returns empty array for no links', () => {
    expect(extractBlockedBy([])).toEqual([]);
  });
  test('returns empty array for null', () => {
    expect(extractBlockedBy(null)).toEqual([]);
  });
  test('extracts blocked-by links', () => {
    const links = [{
      type: { inward: 'is blocked by', outward: 'blocks' },
      inwardIssue: { key: 'PROJ-1' },
    }];
    expect(extractBlockedBy(links)).toContain('PROJ-1');
  });
  test('ignores unrelated link types', () => {
    const links = [{
      type: { inward: 'relates to', outward: 'relates to' },
      inwardIssue: { key: 'PROJ-2' },
    }];
    expect(extractBlockedBy(links)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd static/gantt-app && npm test -- jiraIssueMapping
```
Expected: All 7 tests pass.

- [ ] **Step 4: Commit**

```bash
git add static/gantt-app/src/utils/jiraIssueMapping.js static/gantt-app/src/utils/jiraIssueMapping.test.js
git commit -m "feat(jira): add frontend jira mapping utilities and tests"
```

---

## Task 7: Frontend — useJiraData hook

**Files:**
- Create: `static/gantt-app/src/hooks/useJiraData.js`

- [ ] **Step 1: Create `static/gantt-app/src/hooks/useJiraData.js`**

```js
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import { JIRA_DEFAULT_CONFIG } from '../utils/jiraIssueMapping';

export function useJiraData(projectKey, siteUrl) {
  const [tasks, setTasks] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [dateFields, setDateFields] = useState([]);
  const [config, setConfig] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const loadIssues = useCallback(async (cfg) => {
    const res = await invoke('getProjectIssues', { projectKey, config: cfg, siteUrl });
    return res?.success ? res.data : [];
  }, [projectKey, siteUrl]);

  const load = useCallback(async () => {
    if (!projectKey) return;
    setIsReady(false);
    try {
      const [configRes, typesRes, fieldsRes] = await Promise.all([
        invoke('getProjectConfig', { projectKey }),
        invoke('getProjectIssueTypes', { projectKey }),
        invoke('getProjectDateFields', { projectKey }),
      ]);

      const cfg = configRes?.success ? configRes.data : JIRA_DEFAULT_CONFIG;
      setConfig(cfg);
      setIssueTypes(typesRes?.success ? typesRes.data : []);
      setDateFields(fieldsRes?.success ? fieldsRes.data : []);

      const issues = await loadIssues(cfg);
      setTasks(issues);
    } catch (err) {
      console.error('useJiraData load error:', err);
    } finally {
      setIsReady(true);
    }
  }, [projectKey, loadIssues]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = useCallback(async (newConfig) => {
    setConfig(newConfig);
    setIsReloading(true);
    try {
      await invoke('saveProjectConfig', { projectKey, config: newConfig });
      const issues = await loadIssues(newConfig);
      setTasks(issues);
    } finally {
      setIsReloading(false);
    }
  }, [projectKey, loadIssues]);

  const reload = useCallback(async () => {
    if (!config) return;
    setIsReloading(true);
    try {
      const issues = await loadIssues(config);
      setTasks(issues);
    } finally {
      setIsReloading(false);
    }
  }, [config, loadIssues]);

  return { tasks, issueTypes, dateFields, config, isReady, isReloading, saveConfig, reload };
}
```

- [ ] **Step 2: Commit**

```bash
git add static/gantt-app/src/hooks/useJiraData.js
git commit -m "feat(jira): add useJiraData hook for fetching and configuring Jira issues"
```

---

## Task 8: Frontend — useJiraEdit hook

**Files:**
- Create: `static/gantt-app/src/hooks/useJiraEdit.js`

- [ ] **Step 1: Create `static/gantt-app/src/hooks/useJiraEdit.js`**

```js
import { useState, useCallback } from 'react';
import { invoke } from '@forge/bridge';

export function useJiraEdit({ onSaveSuccess }) {
  const [editingTask, setEditingTask] = useState(null);
  const [pendingEdits, setPendingEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const startEditing = useCallback((task) => {
    setEditingTask(task);
    setPendingEdits({});
    setSaveError(null);
  }, []);

  const applyEdit = useCallback((field, value) => {
    setPendingEdits(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveToJira = useCallback(async (config) => {
    if (!editingTask || Object.keys(pendingEdits).length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const fields = {};
      if (pendingEdits.name !== undefined) fields.summary = pendingEdits.name;
      if (pendingEdits.startDate !== undefined) fields[config.startDateField] = pendingEdits.startDate;
      if (pendingEdits.endDate !== undefined) fields[config.endDateField] = pendingEdits.endDate;
      if (pendingEdits.assigneeId !== undefined) fields.assignee = { id: pendingEdits.assigneeId };

      const res = await invoke('updateJiraIssue', {
        issueKey: editingTask.jiraIssueKey,
        fields,
      });

      if (res?.success) {
        setEditingTask(null);
        setPendingEdits({});
        onSaveSuccess?.();
      } else {
        setSaveError('Falha ao salvar. Tente novamente.');
      }
    } catch (err) {
      setSaveError('Erro de conexão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }, [editingTask, pendingEdits, onSaveSuccess]);

  const cancelEdit = useCallback(() => {
    setEditingTask(null);
    setPendingEdits({});
    setSaveError(null);
  }, []);

  return {
    editingTask,
    pendingEdits,
    isSaving,
    saveError,
    startEditing,
    applyEdit,
    saveToJira,
    cancelEdit,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add static/gantt-app/src/hooks/useJiraEdit.js
git commit -m "feat(jira): add useJiraEdit hook for pending edits and save to Jira"
```

---

## Task 9: Frontend — JiraSettingsPanel component

**Files:**
- Create: `static/gantt-app/src/components/JiraSettingsPanel.jsx`

- [ ] **Step 1: Create `static/gantt-app/src/components/JiraSettingsPanel.jsx`**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add static/gantt-app/src/components/JiraSettingsPanel.jsx
git commit -m "feat(jira): add JiraSettingsPanel component"
```

---

## Task 10: Frontend — JiraEditPanel component

**Files:**
- Create: `static/gantt-app/src/components/JiraEditPanel.jsx`

- [ ] **Step 1: Create `static/gantt-app/src/components/JiraEditPanel.jsx`**

```jsx
import React from 'react';
import { tokens } from '../tokens';

export function JiraEditPanel({ task, config, pendingEdits, isSaving, saveError, onEdit, onSave, onCancel }) {
  const hasPending = Object.keys(pendingEdits).length > 0;
  const current = { ...task, ...pendingEdits };

  return (
    <div className="detail-panel open" style={{ padding: tokens.spacing[4] }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[3] }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: tokens.textPrimary }}>{task.jiraIssueKey}</span>
        <button onClick={onCancel} aria-label="Fechar"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: tokens.textSubtle, lineHeight: 1 }}>
          ×
        </button>
      </div>

      {/* Pending badge */}
      {hasPending && (
        <div style={{
          background: tokens.bgDanger, border: `1px solid ${tokens.iconDanger}`,
          borderRadius: tokens.radius.md, padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
          marginBottom: tokens.spacing[3],
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: tokens.iconDanger }}>
            ⚠ Alterações não salvas
          </span>
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div style={{
          background: tokens.bgDanger, borderRadius: tokens.radius.md,
          padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
          marginBottom: tokens.spacing[3], fontSize: '13px', color: tokens.iconDanger,
        }}>
          {saveError}
        </div>
      )}

      {/* Name */}
      <div style={{ marginBottom: tokens.spacing[3] }}>
        <label style={labelStyle}>Nome</label>
        <input value={current.name} onChange={e => onEdit('name', e.target.value)} style={inputStyle} />
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[2], marginBottom: tokens.spacing[3] }}>
        <div>
          <label style={labelStyle}>Início</label>
          <input type="date" value={current.startDate} onChange={e => onEdit('startDate', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fim</label>
          <input type="date" value={current.endDate} onChange={e => onEdit('endDate', e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Status (read-only) */}
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <label style={labelStyle}>Status</label>
        <div style={{
          fontSize: '13px', color: tokens.textSubtle, padding: '7px 0',
          borderBottom: `1px solid ${tokens.border}`,
        }}>
          {task.status || '—'}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
        {task.siteUrl && (
          <a href={`https://${task.siteUrl}/browse/${task.jiraIssueKey}`}
            target="_blank" rel="noreferrer"
            style={{ fontSize: '13px', color: tokens.iconInfo, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Abrir no Jira ↗
          </a>
        )}
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <button
            onClick={() => onSave(config)}
            disabled={isSaving || !hasPending}
            style={{
              ...primaryBtn,
              opacity: isSaving || !hasPending ? 0.5 : 1,
              cursor: isSaving || !hasPending ? 'not-allowed' : 'pointer',
            }}>
            {isSaving ? 'Salvando...' : 'Salvar no Jira'}
          </button>
          <button onClick={onCancel} style={secondaryBtn}>Cancelar</button>
        </div>
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
  background: tokens.surfaceRaised, outline: 'none',
};
const primaryBtn = {
  padding: '8px 20px', borderRadius: tokens.radius.md, border: 'none',
  background: 'var(--ds-background-brand-bold, #0052CC)', color: '#fff',
  fontWeight: 700, fontSize: '14px',
};
const secondaryBtn = {
  padding: '8px 20px', borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.border}`,
  background: 'transparent', color: tokens.textPrimary,
  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};
```

- [ ] **Step 2: Commit**

```bash
git add static/gantt-app/src/components/JiraEditPanel.jsx
git commit -m "feat(jira): add JiraEditPanel with explicit Salvar no Jira confirmation"
```

---

## Task 11: Frontend — App.jsx Jira mode integration

**Files:**
- Modify: `static/gantt-app/src/App.jsx`

- [ ] **Step 1: Add Jira-mode imports to App.jsx**

Add these imports after the existing imports:

```js
import { useJiraData } from './hooks/useJiraData';
import { useJiraEdit } from './hooks/useJiraEdit';
import { JiraSettingsPanel } from './components/JiraSettingsPanel';
import { JiraEditPanel } from './components/JiraEditPanel';
```

- [ ] **Step 2: Add context detection state to App component**

Add these state variables at the top of the `App` function, before the existing hooks:

```js
const [isJiraMode, setIsJiraMode] = useState(false);
const [jiraProjectKey, setJiraProjectKey] = useState(null);
const [jiraSiteUrl, setJiraSiteUrl] = useState(null);
const [showSettings, setShowSettings] = useState(false);
```

- [ ] **Step 3: Add context detection useEffect**

Add this `useEffect` immediately after the state declarations:

```js
useEffect(() => {
  view.getContext().then(ctx => {
    if (ctx?.extension?.type === 'jira:projectPage') {
      setIsJiraMode(true);
      setJiraProjectKey(ctx.extension.project?.key || null);
      setJiraSiteUrl(ctx.siteUrl || null);
    }
  }).catch(() => {});
}, []);
```

- [ ] **Step 4: Add Jira hooks below existing hooks**

Add after the existing `const { sidebarRef, ... } = useScrollSync()` line:

```js
// Jira mode hooks
const {
  tasks: jiraTasks,
  issueTypes,
  dateFields,
  config: jiraConfig,
  isReady: jiraReady,
  isReloading: jiraReloading,
  saveConfig,
  reload: jiraReload,
} = useJiraData(isJiraMode ? jiraProjectKey : null, jiraSiteUrl);

const jiraTasksWithCritical = useCriticalPath(jiraTasks);

const jiraPhases = useMemo(() => {
  if (!isJiraMode) return [];
  const seen = new Set();
  const phases = [];
  jiraTasksWithCritical.forEach(t => {
    if (!seen.has(t.phase)) {
      seen.add(t.phase);
      phases.push({ id: t.phase, name: t.phase, color: phaseColor(phases.length) });
    }
  });
  return phases;
}, [isJiraMode, jiraTasksWithCritical]);

const {
  editingTask: jiraEditingTask,
  pendingEdits,
  isSaving,
  saveError,
  startEditing: startJiraEditing,
  applyEdit,
  saveToJira,
  cancelEdit,
} = useJiraEdit({
  onSaveSuccess: () => {
    setSelectedTaskId(null);
    jiraReload();
  },
});
```

- [ ] **Step 5: Add `useMemo` import for jiraPhases**

`useMemo` is already imported. Verify line 1 of App.jsx includes `useMemo`:
```js
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
```
If `useMemo` or `useEffect` is missing, add it.

- [ ] **Step 6: Add Jira loading state to the loading guard**

Find the existing loading guard:
```js
if (!isReady) {
```

Replace with:
```js
if (isJiraMode ? !jiraReady : !isReady) {
```

- [ ] **Step 7: Add Jira mode branch in the JSX return**

Find this comment/pattern in the JSX:
```jsx
<GanttHeader
  zoomUnit={zoomUnit}
  onZoomChange={setZoomUnit}
  onAddTask={() => openAddTask(null)}
  onAddPhase={() => openAddPhase()}
  saveStatus={saveStatus}
  onReload={reload}
  isReloading={isReloading}
/>
```

Replace the entire `return (...)` with:

```jsx
if (isJiraMode) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: tokens.surface, overflow: 'hidden' }}>
      <GanttHeader
        zoomUnit={zoomUnit}
        onZoomChange={setZoomUnit}
        onAddTask={null}
        onAddPhase={null}
        saveStatus={jiraReloading ? 'saving' : 'idle'}
        onReload={jiraReload}
        isReloading={jiraReloading}
        extraActions={
          <button onClick={() => setShowSettings(s => !s)} style={{
            padding: '6px 14px', borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.border}`, background: 'transparent',
            color: tokens.textPrimary, fontWeight: 600, fontSize: '13px', cursor: 'pointer',
          }}>
            ⚙ Configurar
          </button>
        }
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <GanttSidebar
          tasks={jiraTasksWithCritical}
          phases={jiraPhases}
          users={users}
          collapsedPhases={collapsedPhases}
          selectedTaskId={jiraEditingTask?.id}
          onTogglePhase={handleTogglePhase}
          onSelectTask={(id) => {
            const task = jiraTasksWithCritical.find(t => t.id === id);
            if (task) startJiraEditing(task);
          }}
          onUpdateTask={() => {}}
          onDeleteTask={() => {}}
          onMoveTask={() => {}}
          onAddTask={() => {}}
          onMovePhase={() => {}}
          sidebarRef={sidebarRef}
          onScroll={onSidebarScroll}
        />
        <GanttTimeline
          tasks={jiraTasksWithCritical}
          phases={jiraPhases}
          collapsedPhases={collapsedPhases}
          projectStart=""
          projectEnd=""
          zoomUnit={zoomUnit}
          onUpdateTask={(id, updates) => {
            const task = jiraTasksWithCritical.find(t => t.id === id);
            if (task) {
              if (!jiraEditingTask || jiraEditingTask.id !== id) startJiraEditing(task);
              if (updates.startDate) applyEdit('startDate', updates.startDate);
              if (updates.endDate) applyEdit('endDate', updates.endDate);
            }
          }}
          onSelectTask={(id) => {
            const task = jiraTasksWithCritical.find(t => t.id === id);
            if (task) startJiraEditing(task);
          }}
          selectedTaskId={jiraEditingTask?.id}
          timelineRef={timelineRef}
          onScroll={onTimelineScroll}
        />
        {jiraEditingTask && (
          <JiraEditPanel
            task={{ ...jiraEditingTask, ...pendingEdits }}
            config={jiraConfig}
            pendingEdits={pendingEdits}
            isSaving={isSaving}
            saveError={saveError}
            onEdit={applyEdit}
            onSave={saveToJira}
            onCancel={cancelEdit}
          />
        )}
        {showSettings && jiraConfig && (
          <JiraSettingsPanel
            config={jiraConfig}
            issueTypes={issueTypes}
            dateFields={dateFields}
            onSave={(newConfig) => { saveConfig(newConfig); setShowSettings(false); }}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}

return (
  // existing Confluence mode JSX unchanged below
```

- [ ] **Step 8: Update GanttHeader to support `extraActions` prop**

In `static/gantt-app/src/components/GanttHeader.jsx`, update the component signature and add the extra actions slot:

Find:
```jsx
export function GanttHeader({ zoomUnit, onZoomChange, onAddTask, onAddPhase, saveStatus, onReload, isReloading }) {
```

Replace with:
```jsx
export function GanttHeader({ zoomUnit, onZoomChange, onAddTask, onAddPhase, saveStatus, onReload, isReloading, extraActions }) {
```

Find (in the buttons area at the end of the header div):
```jsx
<GhostButton onClick={onAddPhase}>{t('header.addPhase')}</GhostButton>
<PrimaryButton onClick={onAddTask}>{t('header.addTask')}</PrimaryButton>
```

Replace with:
```jsx
{extraActions}
{onAddPhase && <GhostButton onClick={onAddPhase}>{t('header.addPhase')}</GhostButton>}
{onAddTask && <PrimaryButton onClick={onAddTask}>{t('header.addTask')}</PrimaryButton>}
```

- [ ] **Step 9: Add missing import to App.jsx**

Make sure `view` is imported from `@forge/bridge`. Check the top of App.jsx for:
```js
import { invoke, view } from '@forge/bridge';
```
If only `invoke` is imported, add `view`.

- [ ] **Step 10: Build**

```bash
cd static/gantt-app && npm run build
```
Expected: Clean build, no errors.

- [ ] **Step 11: Commit**

```bash
git add static/gantt-app/src/App.jsx static/gantt-app/src/components/GanttHeader.jsx static/gantt-app/src/hooks/useJiraData.js static/gantt-app/src/hooks/useJiraEdit.js
git commit -m "feat(jira): integrate Jira mode into App.jsx with context detection"
```

---

## Task 12: Deploy + Install

**Files:** none (operations only)

- [ ] **Step 1: Deploy to all environments**

```bash
forge deploy --environment production
forge deploy --environment staging
forge deploy --environment development
```
Each should output `✔ Deployed`.

- [ ] **Step 2: Upgrade installations (new write:jira-work scope)**

```bash
forge install -e production -s gmrosa.atlassian.net -p Confluence --upgrade --confirm-scopes --non-interactive
forge install -e production -s gmrosa.atlassian.net -p Jira --upgrade --confirm-scopes --non-interactive
forge install -e staging -s gmrosa.atlassian.net -p Confluence --upgrade --confirm-scopes --non-interactive
forge install -e staging -s gmrosa.atlassian.net -p Jira --upgrade --confirm-scopes --non-interactive
forge install -e development -s gmrosa.atlassian.net -p Confluence --upgrade --confirm-scopes --non-interactive
forge install -e development -s gmrosa.atlassian.net -p Jira --upgrade --confirm-scopes --non-interactive
```

- [ ] **Step 3: Verify installation**

```bash
forge install list
```
Expected: 6 entries — Confluence + Jira for each of 3 environments, all `Up-to-date`.

- [ ] **Step 4: Verify in Jira**

1. Go to `https://gmrosa.atlassian.net`
2. Open any Jira project
3. Look for **Gantt** tab in the project sidebar
4. Click it — Gantt should load with the project's issues

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(jira): deploy Gantt as native Jira project page tab"
```
