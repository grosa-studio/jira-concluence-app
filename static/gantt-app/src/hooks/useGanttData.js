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
  // Refs keep persist() calls free of stale closure issues
  const tasksRef = useRef(tasks);
  const phasesRef = useRef(phases);
  const metaRef = useRef(meta);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { phasesRef.current = phases; }, [phases]);
  useEffect(() => { metaRef.current = meta; }, [meta]);

  const load = useCallback(async () => {
    isFirstLoad.current ? setIsReady(false) : setIsReloading(true);
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
      persist(next, phasesRef.current, metaRef.current);
      return next;
    });
  }, [persist]);

  const setPhases = useCallback((updater) => {
    setPhasesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      phasesRef.current = next;
      persist(tasksRef.current, next, metaRef.current);
      return next;
    });
  }, [persist]);

  const setMetaSafe = useCallback((updater) => {
    setMeta(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      metaRef.current = next;
      persist(tasksRef.current, phasesRef.current, next);
      return next;
    });
  }, [persist]);

  return {
    tasks,
    phases,
    meta,
    isReady,
    isReloading,
    saveStatus,
    setTasks,
    setPhases,
    setMeta: setMetaSafe,
    reload: load,
  };
}
