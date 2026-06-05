import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@forge/bridge';

export function useGanttData() {
  const [tasks, setTasksRaw] = useState([]);
  const [phases, setPhasesRaw] = useState([]);
  const [meta, setMeta] = useState({ projectStart: '', projectEnd: '' });
  const [baselines, setBaselinesRaw] = useState([]);
  const [activity, setActivityRaw] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);
  // Refs keep persist() calls free of stale closure issues
  const tasksRef = useRef(tasks);
  const phasesRef = useRef(phases);
  const metaRef = useRef(meta);
  const baselinesRef = useRef(baselines);
  const activityRef = useRef(activity);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { phasesRef.current = phases; }, [phases]);
  useEffect(() => { metaRef.current = meta; }, [meta]);
  useEffect(() => { baselinesRef.current = baselines; }, [baselines]);
  useEffect(() => { activityRef.current = activity; }, [activity]);

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
            depTypes: t.depTypes || {},
            isMilestone: t.isMilestone || false,
            status: t.status || 'notStarted',
            assigneeIds: t.assigneeIds || [],
            jiraIssueKey: t.jiraIssueKey || '',
            cost: t.cost ?? null,
          }))
        );
        setPhasesRaw(d.phases || []);
        setMeta(d.meta || { projectStart: '', projectEnd: '' });
        setBaselinesRaw(d.baselines || []);
        setActivityRaw(d.activity || []);
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

  const persist = useCallback((t, p, m, b) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving'); // reflect the pending change immediately (don't wait for the debounce)
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await invoke('saveTasks', { data: { tasks: t, phases: p, meta: m, baselines: b, activity: activityRef.current } });
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
      persist(next, phasesRef.current, metaRef.current, baselinesRef.current);
      return next;
    });
  }, [persist]);

  const setPhases = useCallback((updater) => {
    setPhasesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      phasesRef.current = next;
      persist(tasksRef.current, next, metaRef.current, baselinesRef.current);
      return next;
    });
  }, [persist]);

  const setMetaSafe = useCallback((updater) => {
    setMeta(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      metaRef.current = next;
      persist(tasksRef.current, phasesRef.current, next, baselinesRef.current);
      return next;
    });
  }, [persist]);

  const setBaselines = useCallback((updater) => {
    setBaselinesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      baselinesRef.current = next;
      persist(tasksRef.current, phasesRef.current, metaRef.current, next);
      return next;
    });
  }, [persist]);

  // Append a real, persisted activity entry (capped). Newest first.
  const pushActivity = useCallback((entry) => {
    setActivityRaw(prev => {
      const next = [{ id: `a${Date.now()}-${Math.floor(Math.random() * 1000)}`, at: new Date().toISOString(), ...entry }, ...prev].slice(0, 200);
      activityRef.current = next;
      persist(tasksRef.current, phasesRef.current, metaRef.current, baselinesRef.current);
      return next;
    });
  }, [persist]);

  return {
    activity,
    pushActivity,
    tasks,
    phases,
    meta,
    baselines,
    isReady,
    isReloading,
    saveStatus,
    setTasks,
    setPhases,
    setMeta: setMetaSafe,
    setBaselines,
    reload: load,
  };
}
