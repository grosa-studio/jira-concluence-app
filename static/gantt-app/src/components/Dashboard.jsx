import React from 'react';
import './Dashboard.css';

const Dashboard = ({ tasks, phases }) => {
  const totalHours = tasks.reduce((sum, t) => sum + (t.hours || 0), 0);
  const totalDays = totalHours / 8;
  const avgProgress = tasks.length ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0;

  const phaseData = phases.map(phaseName => {
    const phaseTasks = tasks.filter(t => t.phase === phaseName);
    const phaseHours = phaseTasks.reduce((sum, t) => sum + (t.hours || 0), 0);
    const phaseProgress = phaseTasks.length 
      ? Math.round(phaseTasks.reduce((sum, t) => sum + t.progress, 0) / phaseTasks.length) 
      : 0;
    return { name: phaseName, hours: phaseHours, progress: phaseProgress, count: phaseTasks.length };
  }).filter(p => p.count > 0);

  return (
    <div className="dashboard-container">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">TOTAL PROJECT EFFORT</span>
          <div className="kpi-value">{totalHours}h <span className="kpi-subtext">({totalDays} business days)</span></div>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">OVERALL PROGRESS</span>
          <div className="kpi-value">{avgProgress}%</div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">ACTIVE WORKSTREAMS</span>
          <div className="kpi-value">{phaseData.length} <span className="kpi-subtext">/ {phases.length} phases</span></div>
        </div>
      </div>

      {/* Phase Breakdown */}
      <h2 className="section-title">Phase Intelligence Breakdown</h2>
      <div className="phase-grid">
        {phaseData.map(p => (
          <div key={p.name} className="phase-card">
            <div className="phase-header">
              <span className="phase-name">{p.name.toUpperCase()}</span>
              <span className="phase-stat">{p.hours}h</span>
            </div>
            <div style={{ margin: '16px 0' }}>
              <div className="phase-progress-label">
                <span>Completion Status</span>
                <span>{p.progress}%</span>
              </div>
              <div className="progress-track" style={{ height: '8px' }}>
                <div className="progress-bar" style={{ width: `${p.progress}%`, background: p.progress === 100 ? '#36B37E' : '#4C9AFF' }} />
              </div>
            </div>
            <div className="phase-footer">
              {p.count} tasks categorized
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
