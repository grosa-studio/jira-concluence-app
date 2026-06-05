# CLAUDE.md — Veloxylabs Atlassian Forge Agent

> **Regra de ouro**: Nunca assuma. Sempre leia o código, audite o contexto e analise o impacto antes de responder ou propor qualquer alteração. Se houver mais de uma opção, apresente todas com prós e contras.

---

## 0. Identidade do Projeto

Este workspace contém apps **Atlassian Forge** construídos pela Veloxylabs.  
Cada projeto é uma aplicação isolada que roda dentro do iframe do Jira/Confluence via Forge Custom UI.

| App | Pasta | Produto |
|-----|-------|---------|
| Tick | `timesheet-app-personal/` | Timesheet & Analytics para Jira |
| Syngenta TimeSheet | `jira-timesheet-app/` | Timesheet corporativo Jira |
| Telos | `jira-sprint-metrics/` | Sprint Metrics & Planning para Jira |
| Process Mapper | `jira-proccess-mapper/` | BPMN Process Mapper Jira/Confluence |
| Gantt | `confluence-gantt-app/` | Gantt Chart para Confluence |

### Gantt — Arquitetura específica (`confluence-gantt-app/`)
- **Rendering**: sidebar HTML + timeline SVG híbrido — não usar CSS absoluto puro nem SVG puro
- **Altura do macro**: iframe Forge auto-redimensiona ao conteúdo → `body`/`#root` **sem** `height:100vh`/`overflow:hidden` (senão recorta e trava o resize em ~320px). Confluence: `.gantt-app` recebe altura **inline calculada** em `App.jsx` (`ganttAppHeight`, clamp 620–900px, espelha `totalContentHeight` do timeline: `TIMELINE_HEADER_HEIGHT + Σfases[PHASE_HEADER_HEIGHT + nTasks×rowH]`, `rowH=compact?40:52`) — cresce com linhas, depois rola por dentro. Jira: `.gantt-app--fullscreen { height:100vh }` (viewport-relativo, não clampar com max-height no `.gantt-app` base)
- **Busca de usuários**: via `requestJira /rest/api/3/user/search` — endpoint de listagem do Confluence não existe na API v3
- **Locale**: detectado via `view.getContext().then(ctx => applyLocale(ctx?.locale))` do `@forge/bridge`
- **Dark mode**: automático via `var(--ds-*)` — zero código extra; não criar lógica de tema manual
- **Frontend**: plain JavaScript (`.jsx`) — não TypeScript; sem `@types/` neste projeto
- **Build**: `cd static/gantt-app && npm run build` — nunca rodar na raiz do projeto
- **Testes**: Vitest (não Jest) — configurado em `vite.config.js` via `test: { environment: 'jsdom' }`
- **Storage key**: `gantt-v3-${localId}` — sempre incluir sufixo de versão para migrações futuras
- **Hook pattern**: usar `tasksRef`/`phasesRef`/`metaRef` em `useCallback` que chamam `persist()` — evita stale closure
- **Debounce obrigatório**: qualquer input que chame `invoke()` em keystroke deve ter debounce ≥ 300ms
- **Storage import**: `import { kvs as storage } from '@forge/kvs'` — `@forge/api` storage deprecated e com warnings no lint
- **Bridge imports**: `import { invoke, view } from '@forge/bridge'` — `view` necessário para `view.getContext()`; não é re-exportado via `invoke`. ⚠️ **Nunca sombrear o import `view`**: App.jsx tem `const [view,setView]=useState('gantt')` (modo de visualização) → o import do bridge é renomeado para `bridgeView` (`view as bridgeView`). Variável local `view` (string) sombreando o import vira `'gantt'.getContext()` → `TypeError` no mount → macro renderiza box vazio/fino. Sempre via error boundary (`ErrorBoundary` em `main.jsx`) p/ erro de render aparecer na tela, não colapsar o iframe
- **Modo Jira** (jira:projectPage): contexto em `ctx.extension.type === 'jira:projectPage'`, projectKey em `ctx.extension.project?.key`, siteUrl em `ctx.siteUrl`
- **Arquivos-chave**: `manifest.yml` (módulos+scopes), `src/index.js` (todos os resolvers), `static/gantt-app/src/App.jsx` (entry point — detecta modo Jira vs Confluence), `static/gantt-app/src/tokens.js` (design tokens)
- **Modelo de tarefa**: `{id,name,startDate,endDate,progress,phase,status,dependsOn,isMilestone,assigneeIds,jiraIssueKey}`; barras coloridas por `phase` (`phaseColor`) ou `status` (`STATUS_COLORS`) conforme `colorScheme`
- **Barras (SVG)**: gradientes em `<defs>` de `GanttTimeline/index.jsx` (`grad-phase-N`, `grad-status-*`, `grad-critical`, hachura `hatch-blocked`/`hatch-atRisk`, filtro `bar-shadow`); `TaskBar` recebe `fill`/`accent` já resolvidos; helper `lighten()` em `tokens.js`
- **Status/cor/densidade**: `STATUS_COLORS`/`STATUS_ORDER` em `tokens.js`; `colorScheme` (`'phase'|'status'`) e `density` (`'comfortable'|'compact'`) são estado em `App.jsx` passados a header/sidebar/timeline; tarefa tem `status` (default `notStarted`); badge de status no `TaskRow`, select no `TaskDetailPanel`. **Jira traz `status` cru** ("In Progress") → sempre passar por `normalizeStatus()` antes de `STATUS_COLORS`/agrupar
- **i18n**: 10 JSONs em `src/i18n/locales/` (en, pt-BR, es, fr, de, it, nl, pl, ja, zh) — **sem teste de paridade**; adicionar chave nos 10 e validar: `for f in src/i18n/locales/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f'))"; done`. Âncora p/ inserir: linha `  "jira": {`
- **Loading/Empty**: loading usa `<GanttSkeleton>` (classe `.skeleton-pulse`), não texto; `<GanttEmptyState>` aparece quando `tasks.length===0` (modo Confluence); templates-semente em `App.jsx` (`TEMPLATES`)
- **Referência visual**: protótipo "Ganttera/Gantt Pro" (canvas claude.ai) é a fonte da verdade visual — React puro/`window.*`/inline-styles/mock `SAMPLE_GANTT`; **portar visualmente, não copiar** (Forge usa ES modules, resolvers, i18next)
- **date-fns**: `format()` aceita `'I'`/`'R'` (semana ISO) sem flag; `'YYYY'`/`'D'` lançam erro sem `useAdditionalWeekYearTokens`
- **Views**: `view` (`'gantt'|'list'|'board'|'calendar'`) é estado em `App.jsx`; `GanttList`/`GanttBoard`/`GanttCalendar` renderizam os mesmos dados; `GanttCalendar` localiza dia/mês via `Intl` (sem chaves i18n); zoom/densidade só no Gantt
- **Baselines** (só Confluence): persistidas em `data.baselines` no storage `gantt-v3-${localId}` (resolver grava o objeto inteiro — sem mudança); shape `{id,createdAt,snapshot:{[taskId]:{startDate,endDate}}}`; `useGanttData` expõe `setBaselines`; overlay de barras-fantasma na timeline (prop `baseline`) + comparação no `TaskDetailPanel`
- **Origem visual do Pro**: features portadas do protótipo = Lista/Kanban/Calendário, caminho crítico, inspector com abas (Jira), baselines. **Não portar**: cursores ao vivo, IA, top bar/left nav próprios, dashboard/recursos/relatórios, share (teatro standalone / falta infra no Forge)

### Stack comum
- **Plataforma**: Atlassian Forge (Custom UI) — Node.js 22.x backend, React 18 frontend
- **Backend**: `@forge/resolver`, `@forge/api` (JQL/REST via `api.asApp()` ou `api.asUser()`)
- **Frontend**: React 18 + JavaScript (`.jsx`) via Vite, `@forge/bridge` para invocar resolvers
- **Armazenamento**: Forge Storage (key/value) — **sem banco relacional externo nos apps Forge**
- **i18n**: `i18next` + `react-i18next` (locales em `src/i18n/locales/`)
- **Design System**: VDS (Veloxylabs Design System) + tokens Atlaskit (`--ds-*`) + tokens locais (`tokens.ts`)

---

## 1. Regras Comportamentais do Agente

### 1.1 Antes de qualquer resposta
```
OBRIGATÓRIO (nesta ordem):
1. Ler o(s) arquivo(s) relevante(s) — NUNCA responder de memória sobre código existente
2. Mapear dependências: o que o arquivo chama, quem chama esse arquivo
3. Identificar testes existentes para o trecho afetado
4. Verificar se há CLAUDE.md ou docs específicos do sub-projeto
5. Só então propor solução — com alternativas quando existirem
```

### 1.2 Nunca assuma
- Não assuma estrutura de dados retornada pela Jira API (leia a resposta real ou a doc)
- Não assuma permissões — verifique o `manifest.yml` do projeto
- Não assuma qual campo customizado é o correto — os IDs mudam por instância
- Não assuma que uma função existe — verifique o arquivo antes de chamá-la
- Não assuma que algo está quebrado — execute o diagnóstico antes de afirmar

### 1.3 Eficiência de sessão
- Quando a conversa crescer (> 10 tarefas ou > 1h de trabalho), usar `/compact` e iniciar novo chat antes de continuar
- Ao retomar sessão: o summary da conversa anterior é suficiente — não pedir ao usuário para repetir contexto

### 1.4 Comunicação
- Se houver ambiguidade, liste as opções e peça confirmação antes de agir
- Alerte proativamente sobre riscos, mesmo que não perguntado
- Prefira soluções que não quebrem o que já funciona (backward-safe)
- Separe claramente: "o que sei com certeza" vs "o que estou inferindo"

---

## 2. Arquitetura Forge — Restrições Críticas

### 2.1 CSP (Content Security Policy)
Forge roda em iframe com CSP estrito. **Proibido:**
```
❌ <link href="https://fonts.googleapis.com/...">  — bloqueado por CSP
❌ import de CDN externo não listado em permissions.external
❌ fetch() para URLs externas sem permissão no manifest
❌ localStorage / sessionStorage — não suportado no Forge iframe
❌ cookies — não disponíveis no Forge iframe
```
**Permitido:**
```
✅ @fontsource/* — fontes bundladas no JS
✅ SVG inline — sem fetch externo
✅ Forge Storage — único store persistente seguro
✅ import de libs via npm (bundladas pelo Vite/CRA)
```

### 2.2 Permissões — manifest.yml
Antes de usar qualquer API Jira, verifique se a scope está declarada:
```yaml
permissions:
  scopes:
    - read:jira-work       # leitura de issues, worklogs, sprints
    - write:jira-work      # criar/editar worklogs, issues
    - read:jira-user       # dados do usuário
    - storage:app          # Forge Storage
    # Adicionar apenas o necessário — principle of least privilege
```
> ⚠️ **ALERTA**: Adicionar scope não declarada quebra o deploy. Scope nova exige re-install pelo admin.

### 2.3 Contexto de execução
```js
// Backend (resolvers) — tem acesso total à Forge API
// api.asApp()  → age como o app (system-level)
// api.asUser() → age como o usuário atual (respeita permissões Jira)

// REGRA: Prefira api.asUser() para ações de escrita que afetam dados do usuário.
// Use api.asApp() apenas para leituras de configuração ou operações admin.
```

---

## 3. Saúde do Banco de Dados / Storage

> **Prioridade máxima**: Nenhuma alteração pode comprometer a performance do storage ou das queries Jira.

### 3.1 Forge Storage — Regras
```js
// ✅ CORRETO: chave específica e tipada
await storage.get(`worklog:${userId}:${weekKey}`);

// ❌ ERRADO: varredura sem chave definida (equivale a full-scan)
await storage.query().where('entity', startsWith('worklog:')).getMany();
// → Só use query() quando absolutamente necessário, com limit explícito

// ✅ CORRETO: sempre paginar resultados de query
const result = await storage.query()
  .where('entity', startsWith(`cfg:`))
  .limit(50)   // ← SEMPRE com limit
  .getMany();
```

### 3.2 JQL — Regras anti-overload
```js
// ✅ Sempre com filtro de data/projeto (nunca full-scan)
const jql = `project = "${escapeJql(projectKey)}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;

// ❌ JAMAIS
const jql = `worklogAuthor = currentUser()`;  // sem where de data → full-scan

// ✅ Sempre com maxResults explícito
api.asUser().requestJira(route`/rest/api/3/search`, {
  method: 'POST',
  body: JSON.stringify({ jql, maxResults: 100, fields: ['summary','worklog'] }),
});

// ❌ JAMAIS omitir maxResults (default Jira = 50, mas sem controle de pagination)
```

### 3.3 Pagination obrigatória
```js
// Para qualquer coleção que pode crescer ilimitadamente:
async function* paginatedSearch(jql, fields) {
  let startAt = 0;
  const maxResults = 100;
  while (true) {
    const res = await api.asUser().requestJira(route`/rest/api/3/search`, {
      method: 'POST',
      body: JSON.stringify({ jql, startAt, maxResults, fields }),
    });
    const data = await res.json();
    yield* data.issues;
    if (startAt + maxResults >= data.total) break;
    startAt += maxResults;
  }
}
```

### 3.4 Cache obrigatório para dados caros
```js
// Use o padrão withCache() para evitar re-hits na Jira API
const data = await withCache(`sprint:${sprintId}:kpis`, 300, async () => {
  // computação cara — só executa se cache expirou (TTL = 300s)
  return await computeSprintKpis(sprintId);
});
```

### 3.5 Checklist de saúde — toda query nova
- [ ] Tem filtro temporal ou de escopo (project, sprint, user)?
- [ ] Tem `maxResults` ou `limit` explícito?
- [ ] Campos solicitados são apenas os necessários (não `*` ou `all`)?
- [ ] Resultado é cacheado se for chamado múltiplas vezes na sessão?
- [ ] JQL passou por `escapeJql()` antes de interpolação?

---

## 4. Segurança

> **Princípio**: O frontend **nunca** toma decisões de segurança. O backend valida tudo.

### 4.1 Validação — sempre no resolver (backend)
```js
// ✅ CORRETO: validação no resolver
resolver.define('logWork', async ({ payload, context }) => {
  // 1. Validar input
  const { valid, error } = validators.timeSpent(payload.timeSpent);
  if (!valid) return { error };

  // 2. Verificar permissão via Jira (não via flag do frontend)
  const issue = await getIssue(payload.issueKey, context.accountId);
  if (!issue.canEdit) return { error: 'forbidden' };

  // 3. Executar com api.asUser() (respeita permissões Jira nativas)
  return await logWorkToJira(payload, context.accountId);
});

// ❌ ERRADO: deixar o frontend decidir se pode ou não executar
// O frontend pode ser manipulado — só o backend é confiável
```

### 4.2 JQL Injection Prevention
```js
function escapeJql(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/[(){}[\]~!]/g, c => `\\${c}`);
}
// SEMPRE usar escapeJql() antes de interpolar variáveis em JQL
```

### 4.3 Input Sanitization
```js
const validators = {
  dateRange: (start, end) => {
    // Validar formato, range máximo (ex: 365 dias), ordem
  },
  projectKey: (key) => /^[A-Z][A-Z0-9]{1,9}$/.test(key),
  accountId:  (id)  => /^[a-f0-9:]+$/.test(id),
  timeSpent:  (t)   => /^\d+[wdhm](\s\d+[wdhm])*$/.test(t),
  // Nunca aceite strings livres em campos que vão para JQL
};
```

### 4.4 LGPD / Privacidade
```js
// ✅ Dados mínimos necessários — não armazene o que não precisa
// ✅ accountId em vez de nome/email quando possível
// ✅ Dados pessoais nunca em logs (console.log sem PII)
// ✅ TTL nos dados de storage (não guardar indefinidamente)
// ❌ Nunca logar worklogs, nomes ou emails em produção
// ❌ Nunca enviar dados para serviços externos sem consentimento explícito

// Itens obrigatórios para compliance Atlassian Marketplace:
// - privacy-policy.html → declarar quais dados são armazenados
// - support.html → canal de suporte
// - terms-of-service.html → termos claros
```

### 4.5 Pen Test — Checklist por PR
- [ ] Inputs validados no backend (não só no frontend)
- [ ] JQL usa `escapeJql()` em todo input do usuário
- [ ] `api.asUser()` para operações que afetam dados do usuário
- [ ] `api.asApp()` justificado e documentado quando usado
- [ ] Nenhuma credencial hardcoded (use Forge secrets ou env vars)
- [ ] Erros retornam mensagens genéricas ao frontend (sem stack trace)
- [ ] Rate limiting considerado para operações de escrita em massa

---

## 5. Separação de Personas

> Cada persona tem código, rotas e permissões isolados.

### 5.1 Personas suportadas
| Persona | Descrição | Acesso |
|---------|-----------|--------|
| `admin` | Configuração do app, gestão de usuários/grupos | Total |
| `manager` / `lead` | Visualização de times, relatórios agregados | Leitura ampla |
| `member` | Logs próprios, visualização própria | Restrito ao próprio escopo |
| `viewer` | Somente leitura de dashboards compartilhados | Read-only |

### 5.2 Estrutura de arquivos por persona
```
src/
  resolvers/
    admin.js      ← handlers exclusivos de admin (settings, user mgmt)
    member.js     ← handlers de membro (log, view próprio)
    shared.js     ← handlers sem restrição de persona
  frontend/src/
    components/
      admin/      ← componentes exclusivos de admin
      member/     ← componentes de membro
      shared/     ← componentes compartilhados
    hooks/
      useAccessControl.js  ← hook central de permissão
```

### 5.3 Controle de acesso — nunca no frontend
```js
// Backend: sempre verificar persona antes de executar
resolver.define('getTeamWorklogs', async ({ payload, context }) => {
  const access = await getAccessConfig(context.accountId);

  // ❌ JAMAIS: frontend envia "isAdmin: true" e backend acredita
  // ✅ CORRETO: backend busca a configuração real
  if (!access.canViewTeam) {
    return { error: 'forbidden', code: 403 };
  }
  return await fetchTeamWorklogs(payload);
});

// Frontend: só esconde UI (UX), nunca protege dados
function TeamView() {
  const { canViewTeam } = useAccessControl();
  if (!canViewTeam) return <AccessDenied />;  // UI only — backend já protege
  return <TeamDashboard />;
}
```

### 5.4 Hook de controle de acesso
```js
// hooks/useAccessControl.js
export function useAccessControl() {
  const [access, setAccess] = useState(null);
  useEffect(() => {
    invoke('getMyAccess').then(setAccess);  // sempre do backend
  }, []);
  return {
    isAdmin:      access?.role === 'admin',
    canViewTeam:  access?.permissions?.includes('view:team'),
    canLogWork:   access?.permissions?.includes('write:worklog'),
    isLoading:    access === null,
  };
}
```

---

## 6. Design System — VDS + Atlaskit

> **Regra**: Zero valores hardcoded. Todo padding, cor, radius e font-size vem de token.

### 6.1 Hierarquia de tokens (do mais genérico ao mais específico)
```
1. Atlaskit --ds-* vars  → fornecidas pelo Jira em runtime (light/dark automático)
2. VDS tokens --vx-*     → tokens locked do Veloxylabs Design System
3. tokens.ts             → tokens semânticos do app, com fallback para --ds-* e --vx-*
```

### 6.2 Padrão de uso correto
```tsx
// ✅ CORRETO: token semântico com fallback Atlaskit
const styles = {
  background: `var(--ds-surface, ${tokens.light.surfaceBase})`,
  color: `var(--ds-text, ${tokens.light.textPrimary})`,
  border: `1px solid var(--ds-border, ${tokens.light.borderDefault})`,
  borderRadius: tokens.radius.sm,
  padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
};

// ❌ ERRADO: valor literal
const styles = {
  background: '#ffffff',
  color: '#0C1220',
  borderRadius: '6px',
  padding: '8px 16px',
};
```

### 6.3 Light / Dark — Atlaskit automático
```tsx
// Forge injeta automaticamente [data-color-mode="light|dark"] no body.
// Tokens --ds-* já respondem ao tema. Para tokens custom:

// tokens.ts já tem light e dark exports — use via contexto:
const { colorMode } = useTheme(); // @forge/bridge ou context Jira
const t = colorMode === 'dark' ? tokens.dark : tokens.light;

// CSS: prefira var(--ds-*) que muda automaticamente
// JavaScript: use o export correto de tokens.ts
```

### 6.4 Componentes VDS — classes obrigatórias
```tsx
// Botões
<button className="vx-btn" data-variant="primary">Salvar</button>
<button className="vx-btn" data-variant="secondary">Cancelar</button>
<button className="vx-btn" data-variant="ghost" data-size="sm">...</button>
<button className="vx-btn" data-variant="danger">Excluir</button>

// Modais
<div className="vx-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="title">
  <div className="vx-modal" data-size="md">
    <header className="vx-modal-header">
      <h2 className="vx-modal-title" id="title">Título</h2>
    </header>
    <div className="vx-modal-body">...</div>
    <footer className="vx-modal-footer">...</footer>
  </div>
</div>

// Inputs
<div className="vx-field" data-required>
  <label className="vx-field-label" htmlFor="id">Label</label>
  <input className="vx-input" id="id" />
  <span className="vx-field-error">Mensagem de erro</span>
</div>

// Badges
<span className="vx-badge" data-variant="success">Sincronizado</span>
<span className="vx-badge" data-variant="danger">3 erros</span>
```

### 6.5 Filosofia visual — minimalista
```
✅ Cores neutras e suaves (palette.slate*, --ds-surface-*)
✅ Hierarquia via peso tipográfico, não via cor excessiva
✅ Espaçamento generoso (tokens.spacing 4px grid)
✅ Bordas sutis (palette.slate20, --ds-border)
✅ Sombras discretas (tokens.shadow.sm no máximo para cards)
✅ Accent reservado para CTAs primários e estados ativos

❌ Cores saturadas em elementos de fundo
❌ Gradientes complexos em componentes funcionais
❌ Sombras pesadas em elementos recorrentes
❌ Múltiplos CTAs primários na mesma tela
❌ Texto colorido em corpo de texto (só para status/labels)
```

### 6.6 Checklist de auditoria visual (por componente novo)
- [ ] Usa apenas tokens do `tokens.ts` ou `--ds-*` / `--vx-*` vars
- [ ] Zero magic numbers em CSS (px literals proibidos exceto em border-width)
- [ ] Funciona em light mode e dark mode
- [ ] Contraste WCAG AA: texto principal ≥ 4.5:1, UI interativa ≥ 3:1
- [ ] Tap target ≥ 44×44px em mobile (viewport ≤ 1024px)
- [ ] Focus visible em todos os elementos interativos
- [ ] `aria-label` em botões sem texto visível

---

## 7. Internacionalização (i18n)

### 7.1 Regras
```tsx
// ✅ SEMPRE: usar chave i18n
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<button>{t('actions.save')}</button>

// ❌ NUNCA: string hardcoded em componente
<button>Save</button>
<button>Salvar</button>
```

### 7.2 Estrutura de chaves
```json
// en.json — fonte da verdade
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm"
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "forbidden": "You don't have permission to do this.",
    "dateRange": "Date range cannot exceed 365 days."
  },
  "status": {
    "loading": "Loading…",
    "saving": "Saving…",
    "saved": "Saved."
  }
}
```

### 7.3 Locales suportados
`en`, `pt-BR`, `es`, `fr`, `de`, `it`, `nl`, `pl`, `ja`, `zh`

Ao adicionar nova string:
1. Adicionar em `en.json` primeiro
2. Adicionar `pt-BR.json` (obrigatório)
3. Demais locales: marcar com `// TODO: translate` se não tiver tradução imediata

---

## 8. Atlassian Forge — Boas Práticas Nativas

### 8.1 Resolvers — padrão
```js
// ✅ Padrão correto de resolver
resolver.define('myHandler', async ({ payload, context }) => {
  try {
    // 1. Extrair e validar payload
    const { param } = payload;
    if (!param) return { error: 'param is required' };

    // 2. Verificar permissão via Jira (não via payload)
    // 3. Executar operação
    const result = await doWork(param, context.accountId);

    // 4. Retornar resposta tipada
    return { success: true, data: result };
  } catch (err) {
    // Nunca expor stack trace ao frontend
    console.error('myHandler error:', err.message);
    return { error: 'Internal error', code: 500 };
  }
});
```

### 8.2 Jira API — padrões obrigatórios
```js
// Worklogs
GET  /rest/api/3/issue/{issueKey}/worklog?maxResults=100&startAt=0
POST /rest/api/3/issue/{issueKey}/worklog   body: { timeSpent, comment, started }

// Issues (só buscar campos necessários)
POST /rest/api/3/search
body: { jql, fields: ['summary', 'status', 'assignee'], maxResults: 100 }

// User
GET /rest/api/3/myself
GET /rest/api/3/user?accountId={id}

// Sprints (requer softwarecode scope se usar Agile API)
GET /rest/agile/1.0/board/{boardId}/sprint?state=active
GET /rest/agile/1.0/sprint/{sprintId}/issue?maxResults=100
```

### 8.3 Forge Storage — convenções de chave
```js
// Formato: {domínio}:{escopo}:{id}
`settings:app:global`           // config global do app
`settings:user:${accountId}`    // preferências do usuário
`cache:sprint:${sprintId}`      // cache de sprint
`access:config:v1`              // configuração de acesso
`audit:${date}:${accountId}`    // logs de auditoria

// TTL: sempre declarar quando armazenar cache
await storage.setWithTTL(`cache:sprint:${id}`, data, 300); // 5 min
```

### 8.4 Usar 100% das features nativas do Jira
```
✅ Worklogs nativos do Jira (POST /worklog) — não reinventar time tracking
✅ JQL para buscas — não filtrar no JS quando o Jira já filtra
✅ Jira Storage para persistência — não criar DB externo desnecessário
✅ Forge Events para triggers automáticos quando disponível
✅ Atlaskit CSS vars (--ds-*) para temas — não overriding o Jira UI
✅ `context.accountId` para identidade — não pedir login separado
✅ Permissões Jira nativas (project roles, groups) para controle de acesso

❌ Não criar sistema de autenticação paralelo ao Jira
❌ Não criar estrutura de dados que duplica o que o Jira já armazena
❌ Não buscar todos os issues e filtrar no JS (use JQL)
```

---

## 9. Testes

### 9.1 O que testar obrigatoriamente
```js
// 1. Segurança — sempre
describe('Security', () => {
  test('escapeJql previne injeção', () => {
    expect(escapeJql('"; DROP TABLE--')).not.toContain('"');
  });
  test('validators rejeita datas inválidas', () => {
    expect(validators.dateRange('2025-13-01', '2025-12-31').valid).toBe(false);
  });
});

// 2. Cálculos de negócio
describe('Aggregate', () => {
  test('computeSprintKpis retorna velocidade correta', () => { ... });
  test('paginação não perde issues', () => { ... });
});

// 3. i18n — chaves não podem estar faltando
test('todas as chaves em en.json existem em pt-BR.json', () => { ... });
```

### 9.2 Cobertura mínima
- Resolvers de escrita (logWork, saveSettings, etc.): **100%**
- Funções de aggregate/cálculo: **> 80%**
- Componentes UI: snapshot + casos de erro
- Validators e sanitizers: **100%**

### 9.3 Antes de qualquer PR
```bash
# Backend
npm test                          # testes unitários
node src/__tests__/security.test.js  # testes de segurança

# Frontend (Gantt)
cd static/gantt-app
npm test -- --run                 # todos os testes (Vitest, modo CI)
npm run build                     # garantir que builda sem erro

# Forge
forge deploy -e development       # deploy para dev
forge deploy -e staging           # deploy para staging
forge tunnel                      # dev local com hot-reload via bridge
# Após scope nova no manifest — rodar para cada produto/ambiente:
forge install --upgrade -e <env> -s <site> -p Jira --confirm-scopes --non-interactive
forge install --upgrade -e <env> -s <site> -p Confluence --confirm-scopes --non-interactive
forge install list                # verificar se todos os installs estão na versão mais nova
```

---

## 10. Alertas — Situações de Risco Alto

O agente deve **alertar proativamente** nas seguintes situações:

### 🔴 Bloqueadores (não deployar sem resolver)
```
- JQL interpolando variável sem escapeJql()
- api.asApp() em operação de escrita de dados do usuário (use asUser())
- Query de storage sem limit (full-scan)
- Scope nova no manifest.yml sem documentar o motivo
- PII (nome, email, worklog) em console.log
- Hardcode de credencial, token ou ID de instância
- Frontend tomando decisão de autorização (deve ser no backend)
```

### 🟡 Avisos (resolver antes de PR)
```
- JQL sem filtro de data (pode virar full-scan em projetos grandes)
- Cache ausente em query que é chamada múltiplas vezes na sessão
- Componente novo sem aria-label em botão icon-only
- String nova hardcoded em componente (sem i18n)
- Token CSS literal em vez de var()
- Componente sem tratamento de estado de erro
- Resolver sem validação de payload
```

### 🟢 Observações (documentar e monitorar)
```
- Nova dependência npm: verificar tamanho e compatibilidade com Forge
- Novo endpoint Jira: verificar se scope já está no manifest
- Mudança no schema de storage: considerar migração dos dados existentes
- Função nova de mais de 80 linhas: considerar dividir
```

---

## 11. Processo de Mudança — Checklist por Tipo

### Alteração de Backend (resolver)
- [ ] Leu o resolver atual antes de modificar?
- [ ] Validação de payload presente?
- [ ] Usa `api.asUser()` para operações do usuário?
- [ ] Erros tratados e sem stack trace exposto ao frontend?
- [ ] JQL usa `escapeJql()`?
- [ ] Testes atualizados?
- [ ] Nenhuma scope nova sem justificativa?

### Alteração de Frontend (componente)
- [ ] Leu o componente atual antes de modificar?
- [ ] Zero magic numbers CSS?
- [ ] Strings via `t()` do i18next?
- [ ] Estados: loading, error, empty, populated cobertos?
- [ ] Funciona em light e dark mode?
- [ ] Não toma decisão de autorização?
- [ ] Acessibilidade: aria-label, role, foco visível?

### Novo Componente
- [ ] Segue classes VDS (`.vx-btn`, `.vx-modal-*`, etc.)?
- [ ] Usa tokens de `tokens.ts` ou `--ds-*` / `--vx-*`?
- [ ] Tem prop de `onError` ou tratamento de erro inline?
- [ ] Tem estado de loading/skeleton?
- [ ] i18n em todas as strings?
- [ ] Separação de persona: está na pasta correta (`admin/`, `member/`, `shared/`)?

### Nova Feature
- [ ] Impacto em performance de storage/JQL avaliado?
- [ ] Scope necessária já está no manifest?
- [ ] Documentação (README ou CHANGELOG) atualizada?
- [ ] Teste de segurança escrito?

---

## 12. Convenções de Código

### Nomenclatura
```js
// Resolvers: camelCase, verbo + substantivo
resolver.define('getWeeklyWorklogs', ...)
resolver.define('logWork', ...)
resolver.define('updateAccessConfig', ...)

// Storage keys: kebab-case com prefixo de domínio
'settings:app:access-config'
'cache:user:worklog-summary'

// Components: PascalCase
AdminSettings.tsx
LogTimeModal.tsx

// Hooks: camelCase com prefixo 'use'
useGroupAccess.js
useAccessControl.js
```

### Estrutura de resposta dos resolvers
```js
// Sucesso
return { success: true, data: payload };

// Erro de validação
return { success: false, error: 'Mensagem legível', code: 400 };

// Erro de autorização
return { success: false, error: 'forbidden', code: 403 };

// Erro interno (sem detalhes ao frontend)
return { success: false, error: 'Internal error', code: 500 };
```

---

## 13. Referências

### Documentação obrigatória antes de mexer nas APIs
- [Forge Storage API](https://developer.atlassian.com/platform/forge/runtime-reference/storage-api/)
- [Forge Resolver API](https://developer.atlassian.com/platform/forge/runtime-reference/resolver/)
- [Jira Cloud REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Jira Agile REST API](https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/)
- [Atlaskit Design Tokens](https://atlassian.design/components/tokens/all-tokens)
- [Forge Custom UI](https://developer.atlassian.com/platform/forge/custom-ui/)
- [Forge Permissions](https://developer.atlassian.com/platform/forge/permissions/)

### Design System
- `jira-proccess-mapper/docs/veloxylabs-design-system/` → VDS completo (TOKENS, COMPONENTS, ACCESSIBILITY, MIGRATION)
- `timesheet-app-personal/static/frontend/src/tokens.ts` → Tokens Tick com Atlaskit fallback
- `jira-sprint-metrics/src/frontend/style.css` → Tokens Telos com dark mode

---

## 14. Aprendizado Contínuo

O agente deve atualizar seu conhecimento quando:

1. **Novo padrão identificado no código**: Se uma solução melhor já existe em outro arquivo do mesmo projeto, adotá-la em vez de inventar uma nova
2. **Bug recorrente corrigido**: Documentar o padrão correto para evitar regressão
3. **Feedback do review**: Incorporar observações em futuras sugestões

### Antes de propor algo "novo"
```
1. Verificar: já existe algo similar no projeto atual?
2. Verificar: outros apps do workspace resolveram isso de forma melhor?
3. Verificar: a doc oficial do Forge/Atlassian tem um padrão recomendado?
4. Só então propor — com referência ao que foi consultado
```

---

*Mantido por: Veloxylabs — atualizar sempre que um padrão novo for estabelecido ou um problema recorrente for identificado.*
