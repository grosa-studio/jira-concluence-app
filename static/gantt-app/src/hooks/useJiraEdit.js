import { useState, useCallback } from 'react';
import { invoke } from '@forge/bridge';

export function useJiraEdit({ onSaveSuccess }) {
  const [editingTask, setEditingTask] = useState(null);
  const [pendingEdits, setPendingEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const startEditing = useCallback((task) => {
    setEditingTask(task);
    setPendingEdits({});
    setSaveError(null);
  }, []);

  const applyEdit = useCallback((field, value) => {
    setPendingEdits(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveToJira = useCallback(async (config) => {
    if (!editingTask || Object.keys(pendingEdits).length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const fields = {};
      if (pendingEdits.name !== undefined) fields.summary = pendingEdits.name;
      if (pendingEdits.startDate !== undefined) fields[config.startDateField] = pendingEdits.startDate;
      if (pendingEdits.endDate !== undefined) fields[config.endDateField] = pendingEdits.endDate;
      if (pendingEdits.assigneeId !== undefined) fields.assignee = { id: pendingEdits.assigneeId };

      const res = await invoke('updateJiraIssue', {
        issueKey: editingTask.jiraIssueKey,
        fields,
      });

      if (res?.success) {
        setEditingTask(null);
        setPendingEdits({});
        onSaveSuccess?.();
      } else {
        setSaveError('Falha ao salvar. Tente novamente.');
      }
    } catch (err) {
      setSaveError('Erro de conexão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }, [editingTask, pendingEdits, onSaveSuccess]);

  const cancelEdit = useCallback(() => {
    setEditingTask(null);
    setPendingEdits({});
    setSaveError(null);
  }, []);

  return {
    editingTask,
    pendingEdits,
    isSaving,
    saveError,
    startEditing,
    applyEdit,
    saveToJira,
    cancelEdit,
  };
}
