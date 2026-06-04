import React, { useState, useCallback, useRef } from 'react';
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
import { tokens, phaseColor } from './tokens';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const { t } = useTranslation();
  const { tasks, phases, meta, isReady, isReloading, saveStatus, setTasks, setPhases, setMeta, reload } = useGanttData();
  const tasksWithCritical = useCriticalPath(tasks);
  const { sidebarRef, timelineRef, onSidebarScroll, onTimelineScroll } = useScrollSync();

  const [zoomUnit, setZoomUnit] = useState('weeks');
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [users, setUsers] = useState({});

  const [modal, setModal] = useState({ open: false, type: null, defaultPhaseId: null });

  const selectedTask = tasksWithCritical.find(t => t.id === selectedTaskId) || null;

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

  // Cache fetched users in memory
  const handleUsersFetched = useCallback((newUsers) => {
    setUsers(prev => {
      const updated = { ...prev };
      newUsers.forEach(u => { updated[u.accountId] = u; });
      return updated;
    });
  }, []);

  if (!isReady) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tokens.textSubtle, fontSize: '14px', fontWeight: 600 }}>
        {t('status.loading')}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: tokens.surface, overflow: 'hidden' }}>
      <GanttHeader
        zoomUnit={zoomUnit}
        onZoomChange={setZoomUnit}
        onAddTask={() => openAddTask(null)}
        onAddPhase={() => openAddPhase()}
        saveStatus={saveStatus}
        onReload={reload}
        isReloading={isReloading}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
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
        />

        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            tasks={tasksWithCritical}
            phases={phases}
            users={users}
            onUpdate={handleUpdateTask}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </div>

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
