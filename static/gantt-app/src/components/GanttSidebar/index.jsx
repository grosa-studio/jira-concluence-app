import React from 'react';
import { useTranslation } from 'react-i18next';
import { tokens, GANTT, phaseColor } from '../../tokens';
import { PhaseRow } from './PhaseRow';
import { TaskRow } from './TaskRow';
import { spanDuration } from '../../utils/duration';
import { useSettings } from '../../contexts/settings';

export function GanttSidebar({
  tasks, phases, users,
  collapsedPhases, selectedTaskId,
  onTogglePhase, onSelectTask,
  onUpdateTask, onDeleteTask, onMoveTask,
  onAddTask, onMovePhase,
  sidebarRef, onScroll,
  density = 'comfortable',
  groupingActive = false,
}) {
  const { t } = useTranslation();
  const { countWeekends } = useSettings();
  const rowH = density === 'compact' ? 40 : GANTT.ROW_HEIGHT;

  return (
    <div style={{
      width: GANTT.SIDEBAR_WIDTH,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: `1px solid ${tokens.border}`,
      background: tokens.surfaceRaised,
    }}>
      {/* Header */}
      <div style={{
        height: GANTT.TIMELINE_HEADER_HEIGHT,
        display: 'flex', alignItems: 'flex-end', gap: tokens.spacing[2],
        padding: `0 ${tokens.spacing[3]} ${tokens.spacing[2]}`,
        borderBottom: `1px solid ${tokens.border}`,
        flexShrink: 0,
        background: tokens.surfaceRaised,
      }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: '10px', fontWeight: 800, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {t('sidebar.workstream')}
        </span>
        <span style={{ width: 58, flexShrink: 0, textAlign: 'right', fontSize: '9px', fontWeight: 800, color: tokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {t('extras.duration')}
        </span>
        <span style={{ width: 56, flexShrink: 0 }} />
      </div>

      {/* Scrollable task list */}
      <div
        ref={sidebarRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {phases.map((phase, pIdx) => {
          const color = phaseColor(pIdx);
          const phaseTasks = tasks.filter(t => t.phase === phase.id);
          const isCollapsed = collapsedPhases.has(phase.id);

          return (
            <React.Fragment key={phase.id}>
              <PhaseRow
                phase={phase}
                color={color}
                isCollapsed={isCollapsed}
                durationDays={spanDuration(phaseTasks, countWeekends)}
                hideActions={groupingActive}
                onToggle={() => onTogglePhase(phase.id)}
                onAddTask={() => onAddTask(phase.id)}
                onMoveUp={() => onMovePhase(phase.id, 'up')}
                onMoveDown={() => onMovePhase(phase.id, 'down')}
              />
              {!isCollapsed && phaseTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  users={users}
                  rowH={rowH}
                  density={density}
                  isSelected={selectedTaskId === task.id}
                  onSelect={onSelectTask}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                  onMoveUp={(id) => onMoveTask(id, 'up')}
                  onMoveDown={(id) => onMoveTask(id, 'down')}
                />
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
