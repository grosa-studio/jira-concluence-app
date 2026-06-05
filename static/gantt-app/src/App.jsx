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
import { tokens, phaseColor, GANTT } from './tokens';
import { view as bridgeView } from '@forge/bridge';
import { useJiraData } from './hooks/useJiraData';
import { useJiraEdit } from './hooks/useJiraEdit';
import { JiraSettingsPanel } from './components/JiraSettingsPanel';
import { JiraEditPanel } from './components/JiraEditPanel';
import { GanttEmptyState } from './components/GanttEmptyState';
import { GanttSkeleton } from './components/GanttSkeleton';
import { GanttList } from './components/GanttList';
import { GanttBoard } from './components/GanttBoard';
import { GanttCalendar } from './components/GanttCalendar';
import { BaselinesPanel } from './components/BaselinesPanel';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// Seed templates for the empty state (content is starter data the user edits).
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

  // Confluence macro is inline and the iframe auto-resizes to content, so the
  // height can't track the viewport. Make it adaptive: at least MIN, grow with
  // the rows (header + phases + visible tasks), capped at MAX (then scroll
  // internally). Mirrors GanttTimeline's totalContentHeight math.
  const ganttAppHeight = useMemo(() => {
    const MIN = 620, MAX = 900, HEADER = 52;
    const rowH = density === 'compact' ? 40 : GANTT.ROW_HEIGHT;
    let content = GANTT.TIMELINE_HEADER_HEIGHT;
    phases.forEach(ph => {
      content += GANTT.PHASE_HEADER_HEIGHT;
      if (!collapsedPhases.has(ph.id)) {
        content += tasks.filter(t => t.phase === ph.id).length * rowH;
      }
    });
    return Math.min(MAX, Math.max(MIN, HEADER + content));
  }, [phases, tasks, collapsedPhases, density]);

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
        <GanttEmptyState onBlank={startBlank} onTemplate={useTemplate} />
      ) : (
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
              tasks={tasksWithCritical}
              phases={phases}
              users={users}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              colorScheme={colorScheme}
            />
          ) : view === 'board' ? (
            <GanttBoard
              tasks={tasksWithCritical}
              phases={phases}
              users={users}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              colorScheme={colorScheme}
            />
          ) : view === 'calendar' ? (
            <GanttCalendar
              tasks={tasksWithCritical}
              phases={phases}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              colorScheme={colorScheme}
            />
          ) : (
            <>
              <GanttSidebar
                tasks={tasksWithCritical}
                phases={phases}
                users={users}
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
                tasks={tasksWithCritical}
                phases={phases}
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
      )}

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
