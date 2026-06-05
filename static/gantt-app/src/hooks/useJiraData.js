import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import { JIRA_DEFAULT_CONFIG } from '../utils/jiraIssueMapping';

export function useJiraData(projectKey, siteUrl) {
  const [tasks, setTasks] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [dateFields, setDateFields] = useState([]);
  const [config, setConfig] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const loadIssues = useCallback(async (cfg) => {
    const res = await invoke('getProjectIssues', { projectKey, config: cfg, siteUrl });
    return res?.success ? res.data : [];
  }, [projectKey, siteUrl]);

  const load = useCallback(async () => {
    if (!projectKey) return;
    setIsReady(false);
    try {
      const [configRes, typesRes, fieldsRes] = await Promise.all([
        invoke('getProjectConfig', { projectKey }),
        invoke('getProjectIssueTypes', { projectKey }),
        invoke('getProjectDateFields', { projectKey }),
      ]);

      const cfg = configRes?.success ? configRes.data : JIRA_DEFAULT_CONFIG;
      setConfig(cfg);
      setIssueTypes(typesRes?.success ? typesRes.data : []);
      setDateFields(fieldsRes?.success ? fieldsRes.data : []);

      const issues = await loadIssues(cfg);
      setTasks(issues);
    } catch (err) {
      console.error('useJiraData load error:', err);
    } finally {
      setIsReady(true);
    }
  }, [projectKey, loadIssues]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = useCallback(async (newConfig) => {
    setConfig(newConfig);
    setIsReloading(true);
    try {
      await invoke('saveProjectConfig', { projectKey, config: newConfig });
      const issues = await loadIssues(newConfig);
      setTasks(issues);
    } finally {
      setIsReloading(false);
    }
  }, [projectKey, loadIssues]);

  const reload = useCallback(async () => {
    if (!config) return;
    setIsReloading(true);
    try {
      const issues = await loadIssues(config);
      setTasks(issues);
    } finally {
      setIsReloading(false);
    }
  }, [config, loadIssues]);

  return { tasks, issueTypes, dateFields, config, isReady, isReloading, saveConfig, reload };
}
