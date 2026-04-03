import React, { useMemo } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import './Dashboard.css';

const Dashboard = ({ tasks, phases, isReloading }) => {
  const delayedTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return tasks.filter(t => {
      const end = parseISO(t.endDate);
      return isBefore(end, today) && t.progress < 100;
    });
  }, [tasks]);

  const totalEffort = tasks.reduce((sum, t) => sum + (t.hours || 0), 0);
  const criticalMilestones = tasks.filter(t => t.isMilestone).length;
  const avgProgress = tasks.length ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0;

  return (
    <div className="dashboard-container" style={{ padding: '32px', backgroundColor: '#FAFBFC' }}>
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Total Effort Card */}
        <div className="kpi-card" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #DFE1E6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: '#6B778C', letterSpacing: '0.5px' }}>TOTAL PROJECT EFFORT</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <h2 style={{ fontSize: '32px', margin: 0, color: '#172B4D' }}>{totalEffort}h</h2>
            <span style={{ fontSize: '13px', color: '#6B778C' }}>({Math.round(totalEffort/8)} business days)</span>
          </div>
          {isReloading && <div className="skeleton-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '16px', zIndex: 1 }} />}
        </div>

        {/* Overdue Items Card */}
        <div className="kpi-card" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: `1px solid ${delayedTasks.length > 0 ? '#FF5630' : '#DFE1E6'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: delayedTasks.length > 0 ? '#FF5630' : '#6B778C', letterSpacing: '0.5px' }}>DELAYED ITEMS</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <h2 style={{ fontSize: '32px', margin: 0, color: delayedTasks.length > 0 ? '#FF5630' : '#172B4D' }}>{delayedTasks.length}</h2>
            <span style={{ fontSize: '13px', color: '#6B778C' }}>critical risks</span>
          </div>
          {isReloading && <div className="skeleton-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '16px', zIndex: 1 }} />}
        </div>

        {/* Milestones Card */}
        <div className="kpi-card" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #DFE1E6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: '#6B778C', letterSpacing: '0.5px' }}>CRITICAL MILESTONES</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <h2 style={{ fontSize: '32px', margin: 0, color: '#FFAB00' }}>{criticalMilestones}</h2>
            <span style={{ fontSize: '13px', color: '#6B778C' }}>deliveries</span>
          </div>
          <span style={{ fontSize: '10px', color: '#A5ADBA', fontWeight: '800', marginTop: '4px', display: 'block' }}>♦ DIAMOND MARKERS</span>
          {isReloading && <div className="skeleton-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '16px', zIndex: 1 }} />}
        </div>

        {/* Velocity Card */}
        <div className="kpi-card" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #DFE1E6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: '#6B778C', letterSpacing: '0.5px' }}>PROJECT VELOCITY</span>
          <h2 style={{ fontSize: '32px', margin: '12px 0', color: '#0052CC' }}>{avgProgress}%</h2>
          <div style={{ height: '6px', backgroundColor: '#EBECF0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${avgProgress}%`, height: '100%', backgroundColor: '#0052CC', transition: 'width 1s ease' }} />
          </div>
          {isReloading && <div className="skeleton-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '16px', zIndex: 1 }} />}
        </div>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#172B4D', marginBottom: '24px' }}>Phase Intelligence Breakdown</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {phases.map(phase => {
          const phaseTasks = tasks.filter(t => t.phase === phase);
          const phaseEffort = phaseTasks.reduce((sum, t) => sum + (t.hours || 0), 0);
          const phaseProgress = phaseTasks.length ? Math.round(phaseTasks.reduce((sum, t) => sum + t.progress, 0) / phaseTasks.length) : 0;
          const phaseDelayed = phaseTasks.filter(t => {
            const end = parseISO(t.endDate);
            return isBefore(end, startOfDay(new Date())) && t.progress < 100;
          });

          return (
            <div key={phase} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #DFE1E6', borderLeft: `4px solid ${phaseDelayed.length > 0 ? '#FF5630' : '#0052CC'}`, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '900', color: '#172B4D', textTransform: 'uppercase' }}>{phase}</h4>
                <div style={{ backgroundColor: '#DEEBFF', color: '#0747A6', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>{phaseEffort}h</div>
              </div>

              {phaseDelayed.map(dt => (
                 <div key={dt.id} style={{ marginBottom: '12px', backgroundColor: '#FFFAE6', padding: '8px', borderRadius: '6px', border: '1px solid #FFE380' }}>
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#FF8B00' }}>⚠ STRATEGIC DELAY RISK</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#172B4D' }}>{dt.name}</span>
                    <span style={{ float: 'right', fontSize: '10px', fontWeight: '900', color: '#FF5630' }}>DUE: {format(parseISO(dt.endDate), 'MMM d')}</span>
                 </div>
              ))}

              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#6B778C' }}>Completion Status</span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#172B4D' }}>{phaseProgress}%</span>
              </div>
              <div style={{ height: '4px', backgroundColor: '#EBECF0', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${phaseProgress}%`, height: '100%', backgroundColor: phaseDelayed.length > 0 ? '#FF5630' : '#4C9AFF', transition: 'width 1s ease' }} />
              </div>
              <p style={{ fontSize: '10px', color: '#A5ADBA', marginTop: '16px', margin: 0 }}>{phaseTasks.length} tasks categorized</p>
              
              {isReloading && <div className="skeleton-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '12px', zIndex: 1 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
