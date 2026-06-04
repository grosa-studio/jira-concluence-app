# Gantt Redesign — Design Spec
**Data:** 2026-06-04  
**Produto:** Confluence Gantt (Atlassian Forge Macro)  
**Status:** Aprovado — aguardando implementação

---

## 1. Objetivo

Reescrever do zero o app Confluence Gantt para ter visual e funcionalidades equivalentes ao Ganttéra, mantendo 100% de conformidade com as restrições do Atlassian Forge (CSP, sem localStorage, sem fetch externo não autorizado, sem CDN externo).

---

## 2. Escopo da V1

| Feature | Incluído |
|---|---|
| Redesign visual completo (estilo Ganttéra, tokens Atlaskit + VDS) | ✅ |
| Fases colapsáveis + sidebar estruturada | ✅ |
| Timeline com barras drag/resize/progress | ✅ |
| Dependências com setas bezier | ✅ |
| Caminho crítico (CPM) automático | ✅ |
| Assignees com avatares (iniciais + cor por hash) | ✅ |
| Painel lateral de detalhes ao clicar na tarefa | ✅ |
| Milestones com marcador de diamante | ✅ |
| Integração Jira (badge de issue key, busca por JQL) | ✅ |
| Integração Confluence (usuários, storage) | ✅ |
| Baseline / comparação vs plano original | ❌ V2 |
| Múltiplas views (Board, Calendário, Lista) | ❌ V2 |
| Filtros e ordenação avançados | ❌ V2 |

---

## 3. Abordagem de Renderização

**Híbrida (recomendada e aprovada):**
- Sidebar e TaskDetailPanel: React DOM (HTML)
- Timeline: SVG — barras, setas de dependência, milestones, caminho crítico, today line
- Scroll sincronizado entre sidebar e timeline via `useRef`

Motivo: melhor performance, export PNG nativo do SVG, setas bezier nativas, avatares e painel em React DOM sem restrições.

---

## 4. Estrutura de Arquivos

### Frontend — `static/gantt-app/src/`

```
components/
  GanttHeader.jsx
  GanttSidebar/
    GanttSidebar.jsx
    PhaseRow.jsx
    TaskRow.jsx
  GanttTimeline/
    GanttTimeline.jsx
    TimelineHeader.jsx
    TaskBar.jsx
    MilestoneMarker.jsx
    DependencyArrow.jsx
    CriticalPathOverlay.jsx
  TaskDetailPanel.jsx
  UserAvatar.jsx
  Modal.jsx

hooks/
  useGanttData.js
  useDrag.js
  useCriticalPath.js
  useScrollSync.js

utils/
  criticalPath.js
  dateUtils.js
  jiraUtils.js

tokens.js
index.css
App.jsx
main.jsx
```

### Backend — `src/index.js`

```
resolver: getTasks           — lê Forge Storage, retorna tarefas + fases + meta
resolver: saveTasks          — valida payload + persiste no Forge Storage
resolver: getConfluenceUsers — requestConfluence() /wiki/rest/api/user/list
resolver: searchJiraIssues   — requestJira() com JQL para linkar issues
```

---

## 5. Modelo de Dados

### Task
```js
{
  id: string,
  name: string,
  startDate: string,       // 'YYYY-MM-DD'
  endDate: string,         // 'YYYY-MM-DD'
  progress: number,        // 0–100
  phase: string,           // id da fase
  dependsOn: string[],     // ids dos predecessores (múltiplos suportados)
  isMilestone: boolean,
  assigneeIds: string[],   // accountIds Confluence/Jira
  jiraIssueKey: string,    // ex: 'DTP-1248' — opcional, pode ser vazio
  // campos computados pelo CPM — não persistidos
  isCritical: boolean,
  float: number,
}
```

### Phase
```js
{ id: string, name: string, color: string }
```

### Meta (salvo junto com tarefas no Forge Storage)
```js
{ projectStart: string, projectEnd: string, phases: Phase[] }
```

### User (cache em memória, não persistido)
```js
{
  accountId: string,
  displayName: string,
  initials: string,    // primeiras letras do nome
  color: string,       // gerado via hash do accountId — sem URL externa
}
```

---

## 6. Algoritmo de Caminho Crítico (CPM)

Executado no frontend sempre que tarefas ou dependências mudam. Não persistido.

```
1. TOPOLOGICAL SORT
   Ordenar tarefas respeitando dependências (Kahn's algorithm)

2. FORWARD PASS
   Para cada tarefa em ordem topológica:
     earlyStart  = max(earlyFinish de todos predecessores) ou 0
     earlyFinish = earlyStart + duração em dias úteis

3. BACKWARD PASS
   Para cada tarefa em ordem reversa:
     lateFinish = min(lateStart de todos sucessores) ou duração total do projeto
     lateStart  = lateFinish - duração

4. FLOAT
   float = lateStart - earlyStart

5. CRÍTICO
   isCritical = (float === 0)
```

Tarefas com `isCritical = true`:
- Borda vermelha na linha da sidebar
- Barra na timeline com tom mais intenso (vermelho/laranja)
- Badge "Caminho crítico" no TaskDetailPanel

---

## 7. Visual Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: logo · zoom D/W/M · + Fase · + Tarefa · save status │
├─────────────────────┬───────────────────────────────────────┤
│                     │  TIMELINE (SVG)                        │
│  SIDEBAR            │  Jan────────Feb────────Mar──           │
│                     │                                        │
│  ▼ Discovery        │  ████████░░░░░░  ← barra              │
│    ● Pesquisa     ◆ │  ░░░████████░░░  ← milestone ◆        │
│    ● Entrevistas    │  ░░░░░░░████──→  ← seta dep.          │
│                     │                                        │
│  ▼ Engineering      │  ░░░░░░░░████   ← crítico (vermelho)  │
│    ● Core API       │  ──────────┊──── ← TODAY (verde)      │
│                     │                                        │
└─────────────────────┴───────────────────────────────────────┘
                                              ↕
                                    [TaskDetailPanel →]
```

### Tokens

| Elemento | Token |
|---|---|
| Fundo geral | `var(--ds-surface, #F7F8F9)` |
| Sidebar fundo | `var(--ds-surface-raised, #FFFFFF)` |
| Borda sidebar | `var(--ds-border, #DFE1E6)` |
| Fase header | `var(--ds-surface-sunken, #F4F5F7)` |
| Today line | `var(--ds-icon-success, #36B37E)` |
| Barra crítica | `var(--ds-icon-danger, #FF5630)` |
| Seta dependência | `var(--ds-border-bold, #8590A2)` |
| Avatar | cor por hash do `accountId` |

Cores das fases (6 opções rotatórias): azul `#4C9AFF`, verde `#36B37E`, roxo `#8777D9`, laranja `#FF8B00`, teal `#00B8D9`, rosa `#FF5630`.

---

## 8. UX Flows

### Adicionar tarefa
`+ Nova Tarefa` → modal (nome, fase, datas) → aparece na sidebar + barra na timeline

### Editar tarefa
- Clique no nome → inline edit na sidebar
- Clique na barra → abre `TaskDetailPanel` (todos os campos)

### Mover / redimensionar
- Drag na barra → move datas; dependentes seguem automaticamente (smart flow)
- Drag na borda direita → estende `endDate`
- Drag no handle de progresso → atualiza `%`

### Adicionar dependência
`TaskDetailPanel` → dropdown "Depende de" → seleciona predecessora → seta bezier aparece → CPM recalcula

### Linkar issue Jira
`TaskDetailPanel` → campo "Issue Jira" → digita key (`DTP-1248`) ou busca por JQL → badge aparece na `TaskRow`

### Caminho crítico
Automático — recalcula a cada mudança de data ou dependência. Sem ação do usuário.

### Colapsar fase
Clique no header → tarefas e barras desaparecem; clique novamente para expandir

---

## 9. Integração Jira + Confluence

### manifest.yml — scopes
```yaml
permissions:
  scopes:
    - read:confluence-props
    - write:confluence-props
    - storage:app
    - read:jira-work
    - read:jira-user
```

### Resolvers de integração
```js
// Buscar usuários — Jira e Confluence compartilham o mesmo diretório Atlassian Cloud.
// Usamos requestJira /user/search (endpoint de listagem de usuários não existe na API Confluence v3).
resolver.define('searchUsers', async ({ payload }) => {
  const res = await api.asUser().requestJira(
    route`/rest/api/3/user/search?query=${encodeURIComponent(payload.query)}&maxResults=20`,
    { headers: { Accept: 'application/json' } }
  );
  return await res.json();
});

// Buscar issues Jira por JQL
resolver.define('searchJiraIssues', async ({ payload }) => {
  const jql = `project = "${escapeJql(payload.project)}" AND text ~ "${escapeJql(payload.query)}"`;
  const res = await api.asUser().requestJira(route`/rest/api/3/search`, {
    method: 'POST',
    body: JSON.stringify({ jql, maxResults: 20, fields: ['summary', 'status', 'assignee'] }),
  });
  return await res.json();
});
```

---

## 10. Restrições Forge Respeitadas

| Restrição | Como resolvemos |
|---|---|
| Sem `localStorage` | Estado efêmero em React; persistência via `invoke('saveTasks')` |
| Sem fetch externo | Todos os dados via `requestConfluence()` / `requestJira()` nos resolvers |
| Sem CDN externo | Fontes via `@fontsource/inter` (npm, bundlado pelo Vite) |
| Sem avatares externos | Iniciais + cor por hash do accountId |
| Sem `window.omelette` | Não usado — persistência via Forge Storage |
| CSP strict | Zero imports de URL externa no frontend |

---

## 11. Formato de Resposta dos Resolvers

```js
// Sucesso
{ success: true, data: payload }

// Erro de validação
{ success: false, error: 'Mensagem legível', code: 400 }

// Erro de autorização
{ success: false, error: 'forbidden', code: 403 }

// Erro interno
{ success: false, error: 'Internal error', code: 500 }
```
