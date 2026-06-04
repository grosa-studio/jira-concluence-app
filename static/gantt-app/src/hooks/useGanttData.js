import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@forge/bridge';

export function useGanttData() {
  const [tasks, setTasksRaw] = useState([]);
  const [phases, setPhasesRaw] = useState([]);
  const [meta, setMeta] = useState({ projectStart: '', projectEnd: '' });
  const [isReady, setIsReady] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) { isFirstLoad.current ? setIsReady(false) : setIsReloading(true); }
    try {
      const res = await invoke('getTasks');
      if (res?.success && res.data) {
        const d = res.data;
        setTasksRaw(
          (d.tasks || []).map(t => ({
            id: t.id,
            name: t.name || 'Untitled',
            startDate: t.startDate,
            endDate: t.endDate,
            progress: t.progress ?? 0,
            phase: t.phase || (d.phases?.[0]?.id ?? ''),
            dependsOn: t.dependsOn || [],
            isMilestone: t.isMilestone || false,
            assigneeIds: t.assigneeIds || [],
            jiraIssueKey: t.jiraIssueKey || '',
          }))
        );
        setPhasesRaw(d.phases || []);
        setMeta(d.meta || { projectStart: '', projectEnd: '' });
      }
    } catch (err) {
      console.error('useGanttData load error:', err);
    } finally {
      setIsReady(true);
      setIsReloading(false);
      isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback((t, p, m) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await invoke('saveTasks', { data: { tasks: t, phases: p, meta: m } });
        setSaveStatus(res?.success ? 'saved' : 'error');
        if (res?.success) setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('error');
      }
    }, 1200);
  }, []);

  const setTasks = useCallback((updater) => {
    setTasksRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setPhasesFn(phases => { persist(next, phases, meta); return phases; });
      return next;
    });
  }, [meta, persist]);

  // Need phases ref for persist calls inside setTasks
  const phasesRef = useRef(phases);
  useEffect(() => { phasesRef.current = phases; }, [phases]);

  const setTasksSafe = useCallback((updater) => {
    setTasksRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist(next, phasesRef.current, meta);
      return next;
    });
  }, [meta, persist]);

  const setPhasesFn = useCallback((updater) => {
    setPhasesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      phasesRef.current = next;
      persist(tasks, next, meta);
      return next;
    });
  }, [tasks, meta, persist]);

  const setMetaSafe = useCallback((updater) => {
    setMeta(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist(tasks, phasesRef.current, next);
      return next;
    });
  }, [tasks, persist]);

  return {
    tasks,
    phases,
    meta,
    isReady,
    isReloading,
    saveStatus,
    setTasks: setTasksSafe,
    setPhases: setPhasesFn,
    setMeta: setMetaSafe,
    reload: () => load(false),
  };
}
