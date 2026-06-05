# Jira Project Page — Design Spec
**Data:** 2026-06-04
**Produto:** Gantt — extensão para Jira (`jira:projectPage`)
**Status:** Aprovado — aguardando implementação

---

## 1. Objetivo

Adicionar o Gantt como aba nativa nos projetos Jira (`jira:projectPage`), com issues reais como tarefas, agrupamento configurável, e edição com confirmação explícita que salva de volta na issue Jira via API.

---

## 2. Abordagem

**Opção 2 (aprovada):** mesmo app Forge, mesmo resource (`dist/`), novo módulo no `manifest.yml`. O frontend detecta o contexto via `view.getContext()` e ramifica entre modo Confluence (storage manual) e modo Jira (issues via JQL).

---

## 3. Escopo

| Feature | Incluído |
|---|---|
| `jira:projectPage` — aba Gantt nos projetos Jira | ✅ |
| Issues Jira como tarefas (Epics, Stories, Tasks, Sub-tasks) | ✅ |
| Issue types configuráveis (carregados dinamicamente do projeto) | ✅ |
| Campos de data configuráveis (start + due, ou customizados) | ✅ |
| Agrupamento configurável (Epic, Componente, Sprint, Label, Fix Version, Tipo) | ✅ |
| Edição com confirmação explícita ("Salvar no Jira") | ✅ |
| Drag de barras — refletido no painel, salvo só ao confirmar | ✅ |
| Dependências via issue links "blocks" → CPM automático | ✅ |
| Modo Confluence existente — sem alterações | ✅ |

---

## 4. Manifest

```yaml
# Adicionar ao manifest.yml existente
jira:projectPage:
  - key: gantt-jira-project-page
    resource: main
    resolver:
      function: resolver
    title: Gantt
    description: Gantt chart for your Jira project

# Scope adicional necessário para salvar edições
permissions:
  scopes:
    - write:jira-work   # ← novo (já temos read:jira-work)
```

---

## 5. Detecção de contexto

```js
// App.jsx — on mount
const ctx = await view.getContext();
const isJiraMode = ctx.extension?.type === 'jira:projectPage';
const projectKey = ctx.extension?.project?.key;

// Ramificação:
// isJiraMode = false → GanttConfluence (comportamento atual)
// isJiraMode = true  → GanttJira (issues Jira + config)
```

---

## 6. Novos Resolvers

### `getProjectConfig`
```js
resolver.define('getProjectConfig', async ({ payload, context }) => {
  const key = `gantt-jira-config-${escapeKey(payload.projectKey)}`;
  const saved = await storage.get(key);
  return {
    success: true,
    data: saved || {
      issueTypes: [],           // vazio = todos os tipos disponíveis
      startDateField: 'start',  // campo Start Date do Jira Software
      endDateField: 'duedate',  // campo Due Date
      groupByField: 'epic',     // 'epic' | 'component' | 'sprint' | 'labels' | 'fixVersions' | 'issuetype'
    },
  };
});
```

### `saveProjectConfig`
```js
resolver.define('saveProjectConfig', async ({ payload, context }) => {
  const { projectKey, config } = payload;
  await storage.set(`gantt-jira-config-${escapeKey(projectKey)}`, config);
  return { success: true };
});
```

### `getProjectIssueTypes`
```js
// GET /rest/api/3/project/${projectKey}/statuses → extrair issueTypes únicos
// Retorna: [{ id, name, iconUrl }]
```

### `getProjectDateFields`
```js
// GET /rest/api/3/field → filtrar type.key === 'date' | 'datetime'
// Retorna: [{ id, name, type }]
```

### `getProjectIssues`
```js
// JQL: project = "KEY" AND issuetype in (...) ORDER BY created ASC
// Paginado: 100 por página via startAt
// Campos: summary, status, assignee, issuetype, duedate, start,
//         customfield_* (campos config), issuelinks, parent, epic
// Retorna tasks mapeadas no formato Gantt
```

### `updateJiraIssue`
```js
resolver.define('updateJiraIssue', async ({ payload }) => {
  const { issueKey, fields } = payload;
  // fields: { summary?, [startField]?, [endField]?, assignee? }
  const res = await api.asUser().requestJira(
    route`/rest/api/3/issue/${issueKey}`,
    { method: 'PUT', body: JSON.stringify({ fields }) }
  );
  return { success: res.ok };
});
```

---

## 7. Modelo de Dados

### Config (Forge Storage)
```js
// chave: gantt-jira-config-${projectKey}
{
  issueTypes: string[],     // nomes dos tipos selecionados; [] = todos
  startDateField: string,   // field id do Jira (ex: 'start', 'customfield_10015')
  endDateField: string,     // field id do Jira (ex: 'duedate')
  groupByField: string,     // 'epic' | 'component' | 'sprint' | 'labels' | 'fixVersions' | 'issuetype'
}
```

### Mapeamento Issue → Task
```js
{
  id:           issue.key,
  name:         issue.fields.summary,
  startDate:    issue.fields[config.startDateField]?.split('T')[0] || today(),
  endDate:      issue.fields[config.endDateField]?.split('T')[0]   || today(),
  progress:     statusToProgress(issue.fields.status.name),
  phase:        getGroupValue(issue, config.groupByField),
  assigneeIds:  [issue.fields.assignee?.accountId].filter(Boolean),
  jiraIssueKey: issue.key,
  isMilestone:  issue.fields.issuetype.name === 'Milestone',
  dependsOn:    extractBlockedBy(issue.fields.issuelinks),
  // campos de edição pendente (não persistidos, apenas UI state)
  _pendingEdits: null,
}
```

### Status → Progress
```js
const STATUS_PROGRESS = {
  'To Do': 0, 'Open': 0, 'Backlog': 0, 'New': 0,
  'In Progress': 50, 'In Review': 40, 'In Development': 50,
  'Done': 100, 'Resolved': 100, 'Closed': 100,
};
// Padrão para status desconhecidos: 0
```

### Dependências
- Links do tipo `"blocks"` / `"is blocked by"` → `dependsOn[]`
- Outros tipos de link: ignorados

---

## 8. Novos Arquivos Frontend

```
hooks/
  useJiraData.js          ← fetch config + issues + mapeamento
  useJiraEdit.js          ← gerencia edições pendentes + saveToJira()

components/
  JiraSettingsPanel.jsx   ← configurar tipos, campos de data, agrupamento
  JiraEditPanel.jsx       ← painel de edição com "Salvar no Jira" (extend TaskDetailPanel)
```

---

## 9. UX — Settings Panel

Abre via **⚙ Configurar** no `GanttHeader`. Slide-in da direita (mesmo padrão do `TaskDetailPanel`).

```
┌─────────────────────────────┐
│ ⚙ Configurações do Gantt  × │
├─────────────────────────────┤
│ TIPOS DE ISSUE              │
│ ☑ Epic   ☑ Story            │
│ ☑ Task   ☑ Sub-task         │
│ ☐ Bug    ☑ Improvement      │
│ (carregado via API)         │
├─────────────────────────────┤
│ CAMPO DE INÍCIO             │
│ [Start date          ▼]     │
├─────────────────────────────┤
│ CAMPO DE FIM                │
│ [Due date            ▼]     │
├─────────────────────────────┤
│ AGRUPAR POR                 │
│ [Epic                ▼]     │
│ Opções: Epic / Componente / │
│ Sprint / Label / Fix Ver. / │
│ Tipo de Issue               │
├─────────────────────────────┤
│ [Salvar]  [Cancelar]        │
└─────────────────────────────┘
```

---

## 10. UX — Edição de Issue

1. Usuário **clica na barra ou no nome** da tarefa → `JiraEditPanel` abre
2. Usuário edita campos (nome, datas, assignee)
3. Arrastar barra na timeline → datas refletidas no painel (state local, não salvo ainda)
4. Usuário clica **"Salvar no Jira"** → `invoke('updateJiraIssue', { issueKey, fields })`
5. Sucesso → painel fecha, issues recarregadas
6. Cancelar → descarta edições pendentes, painel fecha

```
┌─────────────────────────────┐
│ PROJ-42 — Auth API        × │
│ ⚠ Alterações não salvas     │
├─────────────────────────────┤
│ Nome                        │
│ [Auth API              ]    │
├─────────────────────────────┤
│ Início      Fim             │
│ [2026-01-08] [2026-01-16]   │
├─────────────────────────────┤
│ Responsável                 │
│ [Lucas Mendes         ▼]    │
├─────────────────────────────┤
│ Status (read-only)          │
│ 🟡 In Progress              │
├─────────────────────────────┤
│ [Abrir no Jira ↗]           │
│ [Salvar no Jira] [Cancelar] │
└─────────────────────────────┘
```

---

## 11. Fluxo de Dados (Jira mode)

```
App mount
  → view.getContext()        → detecta isJiraMode + projectKey
  → getProjectConfig()       → config salva (ou defaults)
  → getProjectIssueTypes()   → issue types disponíveis
  → getProjectDateFields()   → campos de data disponíveis
  → getProjectIssues(config) → issues paginadas via JQL
  → mapIssuesToTasks()       → formato Gantt
  → computeCriticalPath()    → CPM (mesmo algoritmo)
  → render Gantt             → mesmos componentes sidebar + timeline
```

---

## 12. Restrições Forge

| Restrição | Como resolvemos |
|---|---|
| `write:jira-work` nova scope | Adicionada ao manifest; requer re-install pelo admin |
| Issues sem data de início | Usa `today()` como fallback para não travar o Gantt |
| Issues sem Epic | Agrupadas em "Sem Epic" (ou equivalente ao groupByField) |
| Rate limiting Jira | Paginação 100/página; cache em memória durante sessão |
