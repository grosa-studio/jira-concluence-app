import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import GanttChart from './components/GanttChart';

function App() {
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    // Call the backend resolver to get the tasks (from macro config or defaults)
    invoke('getTasks')
      .then((data) => {
        setTasks(data);
      })
      .catch((err) => {
        console.error("Failed to fetch tasks from Forge resolver:", err);
        // Fallback for local development without Forge environment
        setTasks([
          { id: '1', name: 'Local Dev Task 1', startDate: '2026-04-01', endDate: '2026-04-10', progress: 80 },
          { id: '2', name: 'Local Dev Task 2', startDate: '2026-04-05', endDate: '2026-04-15', progress: 30 },
          { id: '3', name: 'Local Dev Task 3', startDate: '2026-04-12', endDate: '2026-04-25', progress: 0 }
        ]);
      });
  }, []);

  if (!tasks) {
    return <div className="loading">Loading Gantt Chart...</div>;
  }

  return (
    <div className="app-container">
      <GanttChart tasks={tasks} />
    </div>
  );
}

export default App;
