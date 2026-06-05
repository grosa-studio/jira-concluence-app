import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, parseISO } from 'date-fns';
import { useGanttData } from './hooks/useGanttData';
import { useCriticalPath } from './hooks/useCriticalPath';
import { useScrollSync } from './hooks/useScrollSync';
import { GanttHeader } from './components/GanttHeader';
import { GanttSidebar } from './components/GanttSidebar/index';
import { GanttTimeline } from './components/GanttTimeline/index';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { Modal } from './components/Modal';
import { tokens, phaseColor, GANTT, STATUS_ORDER, normalizeStatus } from './tokens';
import { view as bridgeView } from '@forge/bridge';
import { useJiraData } from './hooks/useJiraData';
import { useJiraEdit } from './hooks/useJiraEdit';
import { JiraSettingsPanel } from './components/JiraSettingsPanel';
import { JiraEditPanel } from './components/JiraEditPanel';
import { GanttEmptyState } from './components/GanttEmptyState';
import { GanttFooter } from './components/GanttFooter';
import { GanttControls } from './components/GanttControls';
import { ProLeftNav } from './components/ProLeftNav';
import { GanttSkeleton } from './components/GanttSkeleton';
import { GanttList } from './components/GanttList';
import { GanttBoard } from './components/GanttBoard';
import { GanttCalendar } from './components/GanttCalendar';
import { BaselinesPanel } from './components/BaselinesPanel';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// Seed templates for the empty state (content is starter data the user edits).
const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const TEMPLATES = {
  launch: {
    phases: ['Discovery', 'Design', 'Engineering', 'Launch'],
    tasks: [
      { ph: 0, name: 'Customer research', s: 0, e: 6, p: 100, st: 'done' },
      { ph: 0, name: 'User interviews', s: 4, e: 10, p: 100, st: 'done' },
      { ph: 1, name: 'Wireframes', s: 11, e: 17, p: 60, st: 'inProgress', dep: 1 },
      { ph: 1, name: 'Hi-fi mockups', s: 18, e: 26, st: 'notStarted', dep: 2 },
      { ph: 2, name: 'Core build', s: 27, e: 48, st: 'notStarted', dep: 3 },
      { ph: 2, name: 'QA & bug bash', s: 49, e: 56, st: 'notStarted', dep: 4 },
      { ph: 3, name: 'Beta', s: 57, e: 63, st: 'notStarted', dep: 5 },
      { ph: 3, name: 'GA launch', s: 65, e: 65, m: true, dep: 6 },
    ],
  },
  sprint: {
    phases: ['Planning', 'Execution', 'Review'],
    tasks: [
      { ph: 0, name: 'Sprint planning', s: 0, e: 1, p: 100, st: 'done' },
      { ph: 1, name: 'Development', s: 1, e: 9, p: 40, st: 'inProgress', dep: 0 },
      { ph: 1, name: 'Code review', s: 7, e: 10, st: 'notStarted', dep: 1 },
      { ph: 2, name: 'Demo', s: 10, e: 10, m: true, dep: 2 },
      { ph: 2, name: 'Retro', s: 11, e: 11, st: 'notStarted', dep: 3 },
    ],
  },
  roadmap: {
    phases: ['Q1', 'Q2', 'Q3', 'Q4'],
    tasks: [
      { ph: 0, name: 'Planning & OKRs', s: 0, e: 12, p: 100, st: 'done' },
      { ph: 0, name: 'Foundation', s: 10, e: 50, p: 60, st: 'inProgress', dep: 0 },
      { ph: 0, name: 'Q1 release', s: 55, e: 55, m: true, dep: 1 },
      { ph: 1, name: 'Core features', s: 56, e: 108, st: 'notStarted', dep: 2 },
      { ph: 1, name: 'Q2 release', s: 115, e: 115, m: true, dep: 3 },
      { ph: 2, name: 'Integrations', s: 116, e: 170, st: 'notStarted', dep: 4 },
      { ph: 2, name: 'Q3 release', s: 175, e: 175, m: true, dep: 5 },
      { ph: 3, name: 'Scale & GA', s: 176, e: 230, st: 'notStarted', dep: 6 },
      { ph: 3, name: 'Q4 release', s: 235, e: 235, m: true, dep: 7 },
    ],
  },
  marketing: {
    phases: ['Brief', 'Creative', 'Approval', 'Go-live', 'Analysis'],
    tasks: [
      { ph: 0, name: 'Campaign brief', s: 0, e: 4, p: 100, st: 'done' },
      { ph: 0, name: 'Audience & budget', s: 3, e: 8, p: 100, st: 'done', dep: 0 },
      { ph: 1, name: 'Concepts & copy', s: 9, e: 18, p: 50, st: 'inProgress', dep: 1 },
      { ph: 1, name: 'Asset production', s: 16, e: 28, st: 'notStarted', dep: 2 },
      { ph: 2, name: 'Stakeholder review', s: 29, e: 33, st: 'notStarted', dep: 3 },
      { ph: 3, name: 'Go-live', s: 35, e: 35, m: true, dep: 4 },
      { ph: 3, name: 'Campaign run', s: 35, e: 55, st: 'notStarted', dep: 5 },
      { ph: 4, name: 'Performance report', s: 56, e: 62, st: 'notStarted', dep: 6 },
    ],
  },
  onboarding: {
    phases: ['Kickoff', 'Setup', 'Configuration', 'Training', 'Go-live'],
    tasks: [
      { ph: 0, name: 'Kickoff call', s: 0, e: 1, p: 100, st: 'done' },
      { ph: 0, name: 'Requirements gathering', s: 1, e: 6, p: 100, st: 'done', dep: 0 },
      { ph: 1, name: 'Environment setup', s: 7, e: 13, p: 40, st: 'inProgress', dep: 1 },
      { ph: 1, name: 'Data migration', s: 11, e: 20, st: 'notStarted', dep: 2 },
      { ph: 2, name: 'Configuration', s: 21, e: 30, st: 'notStarted', dep: 3 },
      { ph: 3, name: 'Admin training', s: 31, e: 35, st: 'notStarted', dep: 4 },
      { ph: 3, name: 'End-user training', s: 34, e: 39, st: 'notStarted', dep: 5 },
      { ph: 4, name: 'Go-live', s: 41, e: 41, m: true, dep: 6 },
    ],
  },
  event: {
    phases: ['Definition', 'Logistics', 'Promotion', 'Event', 'Wrap-up'],
    tasks: [
      { ph: 0, name: 'Goals & budget', s: 0, e: 5, p: 100, st: 'done' },
      { ph: 0, name: 'Venue & date', s: 4, e: 10, p: 100, st: 'done', dep: 0 },
      { ph: 1, name: 'Vendors & catering', s: 11, e: 25, p: 30, st: 'inProgress', dep: 1 },
      { ph: 1, name: 'Logistics & AV', s: 20, e: 35, st: 'notStarted', dep: 2 },
      { ph: 2, name: 'Marketing & invites', s: 15, e: 45, st: 'notStarted', dep: 1 },
      { ph: 2, name: 'Registration', s: 25, e: 48, st: 'atRisk', dep: 4 },
      { ph: 3, name: 'Event day', s: 50, e: 50, m: true, dep: 3 },
      { ph: 4, name: 'Follow-up & report', s: 51, e: 58, st: 'notStarted', dep: 6 },
    ],
  },
};

export default function App() {
  const { t } = useTranslation();
  const { tasks, phases, meta, baselines, isReady, isReloading, saveStatus, setTasks, setPhases, setMeta, setBaselines, reload } = useGanttData();
  const tasksWithCritical = useCriticalPath(tasks);
  const { sidebarRef, timelineRef, onSidebarScroll, onTimelineScroll } = useScrollSync();

  const [zoomUnit, setZoomUnit] = useState('weeks');
  const [view, setView] = useState('gantt');
  const [density, setDensity] = useState('comfortable');
  const [colorScheme, setColorScheme] = useState('phase');
  const [showBaselines, setShowBaselines] = useState(false);
  const [activeBaselineId, setActiveBaselineId] = useState(null);
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [users, setUsers] = useState({});
  const [groupBy, setGroupBy] = useState('phase');
  const [sortBy, setSortBy] = useState('manual');
  const [filterStatuses, setFilterStatuses] = useState(() => new Set());
  const [query, setQuery] = useState('');

  // ── Jira mode (jira:projectPage) ──────────────────────────
  const [isJiraMode, setIsJiraMode] = useState(false);
  const [jiraProjectKey, setJiraProjectKey] = useState(null);
  const [jiraSiteUrl, setJiraSiteUrl] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    bridgeView.getContext().then(ctx => {
      if (ctx?.extension?.type === 'jira:projectPage') {
        setIsJiraMode(true);
        setJiraProjectKey(ctx.extension.project?.key || null);
        setJiraSiteUrl(ctx.siteUrl || null);
      }
    }).catch(() => {});
  }, []);

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
    const phaseList = [];
    jiraTasksWithCritical.forEach(t => {
      if (!seen.has(t.phase)) {
        seen.add(t.phase);
        phaseList.push({ id: t.phase, name: t.phase, color: phaseColor(phaseList.length) });
      }
    });
    return phaseList;
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

  const [modal, setModal] = useState({ open: false, type: null, defaultPhaseId: null });

  const selectedTask = tasksWithCritical.find(t => t.id === selectedTaskId) || null;

  // Group / filter / sort derivation → synthetic phases when grouped by status or
  // assignee, so the sidebar/timeline (which render by phase) need no internal
  // changes. Editing still targets real task ids via the handlers.
  const { displayPhases, displayTasks } = useMemo(() => {
    let gPhases, gTasks;
    if (groupBy === 'status') {
      const present = STATUS_ORDER.filter(s => tasksWithCritical.some(tk => normalizeStatus(tk.status || 'notStarted') === s));
      gPhases = present.map(s => ({ id: `__st_${s}`, name: t(`extras.st${CAP(s)}`) }));
      gTasks = tasksWithCritical.map(tk => ({ ...tk, phase: `__st_${normalizeStatus(tk.status || 'notStarted')}` }));
    } else if (groupBy === 'assignee') {
      const names = new Map();
      gTasks = tasksWithCritical.map(tk => {
        const aid = (tk.assigneeIds && tk.assigneeIds[0]) || '__none';
        if (!names.has(aid)) names.set(aid, users[aid]?.displayName || t('detail.none'));
        return { ...tk, phase: `__as_${aid}` };
      });
      gPhases = [...names.entries()].map(([aid, name]) => ({ id: `__as_${aid}`, name }));
    } else {
      gPhases = phases;
      gTasks = tasksWithCritical;
    }
    const q = query.trim().toLowerCase();
    let fTasks = gTasks.filter(tk => {
      if (filterStatuses.size && !filterStatuses.has(normalizeStatus(tk.status || 'notStarted'))) return false;
      if (q && !(tk.name || '').toLowerCase().includes(q) && !(tk.jiraIssueKey || '').toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortBy !== 'manual') {
      const cmp = {
        start: (a, b) => (a.startDate || '').localeCompare(b.startDate || ''),
        end: (a, b) => (a.endDate || '').localeCompare(b.endDate || ''),
        name: (a, b) => (a.name || '').localeCompare(b.name || ''),
        progress: (a, b) => (b.progress || 0) - (a.progress || 0),
      }[sortBy];
      if (cmp) fTasks = [...fTasks].sort(cmp);
    }
    const hasFilter = !!q || filterStatuses.size > 0 || groupBy !== 'phase';
    let outPhases = gPhases;
    if (hasFilter) {
      const used = new Set(fTasks.map(tk => tk.phase));
      outPhases = gPhases.filter(p => used.has(p.id));
    }
    return { displayPhases: outPhases, displayTasks: fTasks };
  }, [groupBy, sortBy, filterStatuses, query, phases, tasksWithCritical, users, t]);

  // Confluence macro is inline and the iframe auto-resizes to content, so the
  // height can't track the viewport. Make it adaptive: at least MIN, grow with
  // the rows (header + controls + phases + visible tasks + footer), capped at MAX.
  const ganttAppHeight = useMemo(() => {
    const MIN = 620, MAX = 900, HEADER = 92, FOOTER = 30;
    const CONTROLS = (view === 'gantt' || view === 'list') ? 42 : 0;
    const rowH = density === 'compact' ? 40 : GANTT.ROW_HEIGHT;
    let content = GANTT.TIMELINE_HEADER_HEIGHT;
    displayPhases.forEach(ph => {
      content += GANTT.PHASE_HEADER_HEIGHT;
      if (!collapsedPhases.has(ph.id)) {
        content += displayTasks.filter(t => t.phase === ph.id).length * rowH;
      }
    });
    return Math.min(MAX, Math.max(MIN, HEADER + FOOTER + CONTROLS + content));
  }, [displayPhases, displayTasks, collapsedPhases, density, view]);

  const handleSelectTask = useCallback((id) => {
    setSelectedTaskId(prev => prev === id ? null : id);
  }, []);

  const handleUpdateTask = useCallback((id, updates) => {
    setTasks(prev => {
      let next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      // Smart flow: if endDate changes, shift dependents
      if (updates.endDate) {
        const newEnd = parseISO(updates.endDate);
        next = next.map(t => {
          if ((t.dependsOn || []).includes(id)) {
            const predEnd = newEnd;
            const taskStart = parseISO(t.startDate);
            if (taskStart <= predEnd) {
              const duration = Math.max(1, Math.round((parseISO(t.endDate) - taskStart) / 86400000));
              const nextStart = addDays(predEnd, 1);
              return {
                ...t,
                startDate: format(nextStart, 'yyyy-MM-dd'),
                endDate: format(addDays(nextStart, duration), 'yyyy-MM-dd'),
              };
            }
          }
          return t;
        });
      }
      return next;
    });
  }, [setTasks]);

  const handleDeleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  }, [setTasks, selectedTaskId]);

  const handleMoveTask = useCallback((id, direction) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      if (direction === 'up' && idx > 0) [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      if (direction === 'down' && idx < next.length - 1) [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, [setTasks]);

  const handleMovePhase = useCallback((id, direction) => {
    setPhases(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      if (direction === 'up' && idx > 0) [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      if (direction === 'down' && idx < next.length - 1) [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, [setPhases]);

  const handleTogglePhase = useCallback((id) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const openAddTask = useCallback((phaseId) => {
    setModal({ open: true, type: 'task', defaultPhaseId: phaseId || phases[0]?.id });
  }, [phases]);

  const openAddPhase = useCallback(() => {
    setModal({ open: true, type: 'phase', defaultPhaseId: null });
  }, []);

  const [modalName, setModalName] = useState('');
  const [modalStart, setModalStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modalEnd, setModalEnd] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [modalPhase, setModalPhase] = useState('');

  const handleModalOpen = (m) => {
    setModal(m);
    setModalName('');
    setModalStart(format(new Date(), 'yyyy-MM-dd'));
    setModalEnd(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    setModalPhase(m.defaultPhaseId || phases[0]?.id || '');
  };

  const handleConfirmModal = () => {
    if (!modalName.trim()) return;
    if (modal.type === 'task') {
      const newTask = {
        id: generateId(),
        name: modalName.trim(),
        startDate: modalStart,
        endDate: modalEnd,
        progress: 0,
        phase: modalPhase || phases[0]?.id || '',
        dependsOn: [],
        isMilestone: false,
        status: 'notStarted',
        assigneeIds: [],
        jiraIssueKey: '',
      };
      setTasks(prev => [...prev, newTask]);
    } else if (modal.type === 'phase') {
      const newPhase = {
        id: generateId(),
        name: modalName.trim(),
        color: phaseColor(phases.length),
      };
      setPhases(prev => [...prev, newPhase]);
    }
    setModal({ open: false, type: null, defaultPhaseId: null });
  };

  // ── Empty-state actions ───────────────────────────────────
  const startBlank = useCallback(() => {
    const today = new Date();
    const d = (o) => format(addDays(today, o), 'yyyy-MM-dd');
    let phaseId = phases[0]?.id;
    if (!phaseId) {
      const p = { id: generateId(), name: t('empty.seedPhase'), color: phaseColor(0) };
      setPhases([p]);
      phaseId = p.id;
    }
    const seed = t('empty.seedTask');
    setTasks([
      { id: generateId(), name: `${seed} 1`, startDate: d(0), endDate: d(4), progress: 0, phase: phaseId, dependsOn: [], isMilestone: false, status: 'notStarted', assigneeIds: [], jiraIssueKey: '' },
      { id: generateId(), name: `${seed} 2`, startDate: d(3), endDate: d(9), progress: 0, phase: phaseId, dependsOn: [], isMilestone: false, status: 'notStarted', assigneeIds: [], jiraIssueKey: '' },
    ]);
  }, [phases, setPhases, setTasks, t]);

  const useTemplate = useCallback((id) => {
    const tpl = TEMPLATES[id];
    if (!tpl) return;
    const today = new Date();
    const d = (o) => format(addDays(today, o), 'yyyy-MM-dd');
    const newPhases = tpl.phases.map((name, i) => ({ id: generateId(), name, color: phaseColor(i) }));
    const ids = tpl.tasks.map(() => generateId());
    const newTasks = tpl.tasks.map((tk, i) => ({
      id: ids[i],
      name: tk.name,
      startDate: d(tk.s),
      endDate: d(tk.e),
      progress: tk.p ?? 0,
      phase: newPhases[tk.ph].id,
      dependsOn: tk.dep != null ? [ids[tk.dep]] : [],
      isMilestone: !!tk.m,
      status: tk.st || 'notStarted',
      assigneeIds: [],
      jiraIssueKey: '',
    }));
    setPhases(newPhases);
    setTasks(newTasks);
  }, [setPhases, setTasks]);

  const importCsv = useCallback((text) => {
    const today = new Date();
    const d = (o) => format(addDays(today, o), 'yyyy-MM-dd');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const phase = { id: generateId(), name: t('empty.seedPhase'), color: phaseColor(0) };
    const newTasks = lines.map((l, i) => {
      const parts = l.split(',').map(c => c.trim());
      const name = parts[0] || `${t('empty.seedTask')} ${i + 1}`;
      const start = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] || '') ? parts[1] : d(i * 2);
      const end = /^\d{4}-\d{2}-\d{2}$/.test(parts[2] || '') ? parts[2] : start;
      return { id: generateId(), name, startDate: start, endDate: end, progress: 0, phase: phase.id, dependsOn: [], isMilestone: false, status: 'notStarted', assigneeIds: [], jiraIssueKey: '', cost: null };
    });
    if (newTasks.length) { setPhases([phase]); setTasks(newTasks); }
  }, [setPhases, setTasks, t]);

  // ── Baselines ─────────────────────────────────────────────
  const createBaseline = useCallback(() => {
    const snapshot = {};
    tasks.forEach(tk => { snapshot[tk.id] = { startDate: tk.startDate, endDate: tk.endDate }; });
    const bl = { id: generateId(), createdAt: format(new Date(), 'yyyy-MM-dd'), snapshot };
    setBaselines(prev => [...prev, bl]);
    setActiveBaselineId(bl.id);
  }, [tasks, setBaselines]);

  const deleteBaseline = useCallback((id) => {
    setBaselines(prev => prev.filter(b => b.id !== id));
    setActiveBaselineId(cur => (cur === id ? null : cur));
  }, [setBaselines]);

  const activeBaseline = baselines.find(b => b.id === activeBaselineId) || null;

  // Cache fetched users in memory
  const handleUsersFetched = useCallback((newUsers) => {
    setUsers(prev => {
      const updated = { ...prev };
      newUsers.forEach(u => { updated[u.accountId] = u; });
      return updated;
    });
  }, []);

  if (isJiraMode ? !jiraReady : !isReady) {
    return <GanttSkeleton fullscreen={isJiraMode} />;
  }

  if (isJiraMode) {
    return (
      <div className="gantt-app gantt-app--fullscreen">
        <GanttHeader
          zoomUnit={zoomUnit}
          onZoomChange={setZoomUnit}
          view={view}
          onViewChange={setView}
          criticalCount={jiraTasksWithCritical.filter(t => t.isCritical).length}
          colorScheme={colorScheme}
          onColorByChange={setColorScheme}
          density={density}
          onDensityChange={setDensity}
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
              ⚙ {t('jira.settings.title')}
            </button>
          }
        />
        <div className="gantt-app-content">
          {view === 'list' ? (
            <GanttList
              tasks={jiraTasksWithCritical}
              phases={jiraPhases}
              users={users}
              selectedTaskId={jiraEditingTask?.id}
              onSelectTask={(id) => {
                const task = jiraTasksWithCritical.find(t => t.id === id);
                if (task) startJiraEditing(task);
              }}
              colorScheme={colorScheme}
            />
          ) : view === 'board' ? (
            <GanttBoard
              tasks={jiraTasksWithCritical}
              phases={jiraPhases}
              users={users}
              selectedTaskId={jiraEditingTask?.id}
              onSelectTask={(id) => {
                const task = jiraTasksWithCritical.find(t => t.id === id);
                if (task) startJiraEditing(task);
              }}
              colorScheme={colorScheme}
            />
          ) : view === 'calendar' ? (
            <GanttCalendar
              tasks={jiraTasksWithCritical}
              phases={jiraPhases}
              selectedTaskId={jiraEditingTask?.id}
              onSelectTask={(id) => {
                const task = jiraTasksWithCritical.find(t => t.id === id);
                if (task) startJiraEditing(task);
              }}
              colorScheme={colorScheme}
            />
          ) : (
            <>
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
                density={density}
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
                users={users}
                density={density}
                colorScheme={colorScheme}
              />
            </>
          )}
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
              tasks={jiraTasksWithCritical}
              users={users}
              onSelectTask={(id) => {
                const tsk = jiraTasksWithCritical.find(t => t.id === id);
                if (tsk) startJiraEditing(tsk);
              }}
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
    <div className="gantt-app" style={{ height: ganttAppHeight }}>
      <GanttHeader
        zoomUnit={zoomUnit}
        onZoomChange={setZoomUnit}
        view={view}
        onViewChange={setView}
        criticalCount={tasksWithCritical.filter(t => t.isCritical).length}
        colorScheme={colorScheme}
        onColorByChange={setColorScheme}
        density={density}
        onDensityChange={setDensity}
        onToggleBaselines={() => setShowBaselines(s => !s)}
        baselinesOn={showBaselines || !!activeBaselineId}
        baselineCount={baselines.length}
        onAddTask={() => openAddTask(null)}
        onAddPhase={() => openAddPhase()}
        saveStatus={saveStatus}
        onReload={reload}
        isReloading={isReloading}
      />

      {tasks.length === 0 ? (
        <GanttEmptyState onBlank={startBlank} onTemplate={useTemplate} onImport={importCsv} />
      ) : (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <ProLeftNav
            baselineCount={baselines.length}
            onBaselines={() => setShowBaselines(s => !s)}
            baselinesActive={showBaselines}
            progress={(() => { const l = tasksWithCritical.filter(tk => !tk.isMilestone); return l.length ? Math.round(l.reduce((s, tk) => s + (tk.progress || 0), 0) / l.length) : 0; })()}
            criticalCount={tasksWithCritical.filter(tk => tk.isCritical).length}
          />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            {(view === 'gantt' || view === 'list') && (
              <GanttControls
                groupBy={groupBy} onGroupBy={setGroupBy}
                sortBy={sortBy} onSortBy={setSortBy}
                filterStatuses={filterStatuses} onFilterStatuses={setFilterStatuses}
                query={query} onQuery={setQuery}
              />
            )}
            <div className="gantt-app-content">
          {showBaselines && (
            <BaselinesPanel
              baselines={baselines}
              tasks={tasksWithCritical}
              activeId={activeBaselineId}
              onSave={createBaseline}
              onActivate={setActiveBaselineId}
              onDelete={deleteBaseline}
              onClose={() => setShowBaselines(false)}
            />
          )}
          {view === 'list' ? (
            <GanttList
              tasks={displayTasks}
              phases={displayPhases}
              users={users}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              colorScheme={colorScheme}
            />
          ) : view === 'board' ? (
            <GanttBoard
              tasks={displayTasks}
              phases={displayPhases}
              users={users}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              colorScheme={colorScheme}
            />
          ) : view === 'calendar' ? (
            <GanttCalendar
              tasks={displayTasks}
              phases={displayPhases}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              colorScheme={colorScheme}
            />
          ) : (
            <>
              <GanttSidebar
                tasks={displayTasks}
                phases={displayPhases}
                users={users}
                groupingActive={groupBy !== 'phase'}
                collapsedPhases={collapsedPhases}
                selectedTaskId={selectedTaskId}
                onTogglePhase={handleTogglePhase}
                onSelectTask={handleSelectTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
                onAddTask={(phaseId) => handleModalOpen({ open: true, type: 'task', defaultPhaseId: phaseId })}
                onMovePhase={handleMovePhase}
                sidebarRef={sidebarRef}
                onScroll={onSidebarScroll}
                density={density}
              />

              <GanttTimeline
                tasks={displayTasks}
                phases={displayPhases}
                collapsedPhases={collapsedPhases}
                projectStart={meta.projectStart}
                projectEnd={meta.projectEnd}
                zoomUnit={zoomUnit}
                onUpdateTask={handleUpdateTask}
                onSelectTask={handleSelectTask}
                selectedTaskId={selectedTaskId}
                timelineRef={timelineRef}
                onScroll={onTimelineScroll}
                users={users}
                density={density}
                colorScheme={colorScheme}
                baseline={activeBaseline}
              />
            </>
          )}

          {selectedTask && (
            <TaskDetailPanel
              task={selectedTask}
              tasks={tasksWithCritical}
              phases={phases}
              users={users}
              onUpdate={handleUpdateTask}
              onClose={() => setSelectedTaskId(null)}
              baseline={activeBaseline}
            />
          )}
            </div>
          </div>
        </div>
      )}

      {tasks.length > 0 && <GanttFooter tasks={tasksWithCritical} saveStatus={saveStatus} />}

      <Modal
        isOpen={modal.open}
        title={modal.type === 'task' ? t('modal.addTask') : t('modal.addPhase')}
        onClose={() => setModal({ open: false, type: null, defaultPhaseId: null })}
        onConfirm={handleConfirmModal}
        confirmLabel={t('modal.confirm')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
          <div>
            <label style={labelStyle}>{t('modal.name')}</label>
            <input
              autoFocus value={modalName}
              onChange={e => setModalName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmModal(); }}
              style={inputStyle}
            />
          </div>
          {modal.type === 'task' && (
            <>
              <div>
                <label style={labelStyle}>{t('modal.phase')}</label>
                <select value={modalPhase} onChange={e => setModalPhase(e.target.value)} style={inputStyle}>
                  {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[2] }}>
                <div>
                  <label style={labelStyle}>{t('modal.startDate')}</label>
                  <input type="date" value={modalStart} onChange={e => setModalStart(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t('modal.endDate')}</label>
                  <input type="date" value={modalEnd} onChange={e => setModalEnd(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: tokens.textSubtle, marginBottom: '4px',
};
const inputStyle = {
  width: '100%', padding: '8px 10px',
  border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md,
  fontSize: '13px', color: tokens.textPrimary,
  background: tokens.surfaceRaised, outline: 'none',
};
