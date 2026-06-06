# static/gantt-app — Frontend Gantt (React 18 + Vite)

## Comandos
```bash
npm run build       # produção
npm run dev         # vite dev server (sem bridge — usar forge tunnel para integração real)
npm test -- --run   # Vitest modo CI
```

## Componentes principais (`src/components/`)
| Arquivo | Responsabilidade |
|---------|-----------------|
| `App.jsx` | Entry point — detecta Jira vs Confluence, estado global, roteamento de views |
| `GanttHeader.jsx` | Toolbar: zoom, density, view switcher, weekend/deps toggles, baselines |
| `GanttSidebar/` | Lista de fases/tarefas — `PhaseRow.jsx`, `TaskRow.jsx` |
| `GanttTimeline/` | SVG timeline — `TaskBar`, grid, dependency arrows, today marker |
| `TaskDetailPanel.jsx` | Inspector dockado (abas: details / resources / history); empurra timeline (in-flow, não absolute) |
| `ProLeftNav.jsx` | Nav lateral — auto-colapsa (`forceCollapsed`) quando inspector abre |
| `GanttReports.jsx` | 8 visualizações: KPIs, burndown SVG, por fase/status/marcos/custo/atraso |
| `GanttResources.jsx` | Carga por pessoa (dias alocados por assignee) |
| `GanttFooter.jsx` | Barra de métricas inferior (ADS bold-surface tokens — dark-aware) |
| `GanttEmptyState.jsx` | Tela de boas-vindas com templates; só em modo Confluence |
| `GanttSkeleton.jsx` | Loading skeleton (`.skeleton-pulse`) |
| `BaselinesPanel.jsx` | Lista de baselines salvas (só Confluence) |
| `ProLeftNav.jsx` | Sidebar de navegação: timeline / reports / resources / integrations |
| `JiraEditPanel.jsx` | Painel de edição de issue Jira (modo jira:projectPage) |
| `JiraSettingsPanel.jsx` | Configurações de integração Jira (field mapping, issue types) |

## Hooks (`src/hooks/`)
- `useGanttData.js` — CRUD no Forge Storage; expõe `tasks`, `phases`, `meta`, `baselines`, `activity`, `pushActivity()`
- `useJiraData.js` — busca issues via resolver `getJiraIssues`
- `useJiraEdit.js` — persiste edições de campo no Jira via resolver `saveJiraField`

## Utils / Contexts (`src/utils/`, `src/contexts/`)
- `utils/duration.js` — `taskDuration(start, end, countWeekends)` e `spanDuration(tasks, countWeekends)`
- `contexts/settings.js` — `SettingsContext` / `useSettings()` — compartilha `countWeekends` sem prop drilling

## i18n (`src/i18n/`)
- `locales/en.json` — fonte da verdade (137 chaves)
- `index.js` — registra 24 locales + `applyLocale()` (mapeamento Atlassian → i18next)
- Validar paridade: `node -e '<script>'` (ver CLAUDE.md raiz para o script completo)

## Tokens (`src/tokens.js`)
Objeto plano único — **não existe `tokens.light` / `tokens.dark`**.
Todos os valores já são `var(--ds-*, fallback)` — dark mode automático via Forge.
Brand colors (`#0C66E4`, `#5E4DB2`) ficam como hex (funcionam em ambos os temas).
