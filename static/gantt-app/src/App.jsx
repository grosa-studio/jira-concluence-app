import React, { useEffect, useState, useCallback, useRef } from 'react';
import { format, parseISO, addDays, differenceInDays, isBefore } from 'date-fns';
import { invoke, view } from '@forge/bridge';
import GanttChart from './components/GanttChart';
import Dashboard from './components/Dashboard';
import Modal from './components/Modal';

import logo from './assets/logo.png';

function App() {
  const [tasks, setTasks] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [chartHeight, setChartHeight] = useState(400);
  const [projectStart, setProjectStart] = useState('');
  const [projectEnd, setProjectEnd] = useState('');
  const [phases, setPhases] = useState(['Initial Phase', 'Execution', 'Testing', 'Launch']);
  const [zoomUnit, setZoomUnit] = useState('weeks'); // Default to 'weeks' for better bird's-eye view
  const [zoomScale, setZoomScale] = useState(1.0);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [modal, setModal] = useState({ isOpen: false, type: '', data: {} });
  const [activeTab, setActiveTab] = useState('timeline'); // timeline | dashboard
  const [isReloading, setIsReloading] = useState(false);
  const saveTimeoutRef = useRef(null);

  // --- Initialization ---
  const loadData = useCallback(async () => {
    // Only blank the screen on the INITIAL load. For subsequent reloads, use isReloading.
    if (!isInitialized) setIsInitialized(false);
    else setIsReloading(true);

    try {
      const data = await invoke('getTasks');
      if (data && data.tasks) {
          setTasks(data.tasks.map(t => ({
            id: t.id || Math.random().toString(36).substr(2, 9),
            name: t.name || 'Untitled Task',
            startDate: t.startDate || new Date().toISOString().split('T')[0],
            endDate: t.endDate || new Date().toISOString().split('T')[0],
            progress: t.progress || 0,
            phase: t.phase || 'Initial Phase',
            hours: t.hours || 8,
            dependsOn: t.dependsOn || '',
            isMilestone: t.isMilestone || false
          })));
          setProjectStart(data.meta?.projectStart || '');
          setProjectEnd(data.meta?.projectEnd || '');
          if (data.meta?.phases) setPhases(data.meta.phases);
          const savedHeight = data.tasks[0]?.macroHeight || 500;
          setChartHeight(savedHeight);
      }
      setIsInitialized(true);
      setIsReloading(false);
    } catch (err) {
      console.error("Init Error:", err);
      setIsInitialized(true);
      setIsReloading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveAll = useCallback(async (currentTasks, currentHeight, pStart, pEnd, currentPhases) => {
    setSaveStatus('saving');
    try {
      const dataToSave = {
        tasks: currentTasks.map((t, i) => i === 0 ? { ...t, macroHeight: currentHeight } : t),
        meta: { projectStart: pStart, projectEnd: pEnd, phases: currentPhases }
      };
      const res = await invoke('saveTasks', { data: dataToSave });
      if (res.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveAll(tasks, chartHeight, projectStart, projectEnd, phases);
    }, 1500); 
    return () => clearTimeout(saveTimeoutRef.current);
  }, [tasks, chartHeight, projectStart, projectEnd, phases, isInitialized, saveAll]);

  const updateTask = (taskId, updates) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      let next = prev.map(t => t.id === taskId ? { ...t, ...updates } : t);
      
      // Smart Flow: If endDate of a task changes, shift followers
      if (updates.endDate) {
        const newEnd = parseISO(updates.endDate);
        next = next.map(t => {
          if (t.dependsOn === taskId) {
            const currentStart = parseISO(t.startDate);
            if (isBefore(currentStart, newEnd) || currentStart.getTime() === newEnd.getTime()) {
              const diff = differenceInDays(parseISO(t.endDate), currentStart);
              const nextStart = addDays(newEnd, 1);
              return { ...t, startDate: format(nextStart, 'yyyy-MM-dd'), endDate: format(addDays(nextStart, diff), 'yyyy-MM-dd') };
            }
          }
          return t;
        });
      }
      return next;
    });
  };

  const addTask = () => {
    const defaultStart = projectStart || new Date().toISOString().split('T')[0];
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Novo Item',
      startDate: defaultStart,
      endDate: format(addDays(parseISO(defaultStart), 5), 'yyyy-MM-dd'),
      progress: 0,
      phase: phases[0],
      hours: 40,
      dependsOn: '',
      isMilestone: false
    };
    setTasks([...tasks, newTask]);
  };

  const moveTask = (taskId, direction) => {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx < 0) return;
    const newTasks = [...tasks];
    if (direction === 'up' && idx > 0) [newTasks[idx], newTasks[idx-1]] = [newTasks[idx-1], newTasks[idx]];
    else if (direction === 'down' && idx < tasks.length - 1) [newTasks[idx], newTasks[idx+1]] = [newTasks[idx+1], newTasks[idx]];
    setTasks(newTasks);
  };

  const movePhase = (phaseName, direction) => {
    const idx = phases.indexOf(phaseName);
    if (idx < 0) return;
    const newPhases = [...phases];
    if (direction === 'up' && idx > 0) [newPhases[idx], newPhases[idx-1]] = [newPhases[idx-1], newPhases[idx]];
    else if (direction === 'down' && idx < phases.length - 1) [newPhases[idx], newPhases[idx+1]] = [newPhases[idx+1], newPhases[idx]];
    setPhases(newPhases);
  };

  const ganttRef = useRef(null);

  if (!isInitialized) return <div style={{ padding: '80px', textAlign: 'center', color: '#6B778C', fontSize: '14px', fontWeight: '800', letterSpacing: '1px' }}>SYNGENTA GANTT | LOADING STRATEGY...</div>;

  return (
    <div className="app-main" style={{ padding: '32px', backgroundColor: '#FAFBFC', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flexGrow: 1, minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logo} alt="Syngenta" style={{ height: '54px', width: 'auto' }} />
            <span style={{ fontSize: '36px', fontWeight: '900', color: '#0052CC', letterSpacing: '-1.5px', marginTop: '6px' }}>Gantt</span>
          </div>
          
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#EBECF0', padding: '3px', borderRadius: '10px', marginTop: '16px', width: 'fit-content', border: '1px solid #DFE1E6' }}>
            <button 
              onClick={() => setActiveTab('timeline')}
              style={{ fontSize: '11px', fontWeight: '900', color: activeTab === 'timeline' ? '#172B4D' : '#6B778C', backgroundColor: activeTab === 'timeline' ? 'white' : 'transparent', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', boxShadow: activeTab === 'timeline' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none', transition: '0.2s' }}
            >TIMELINE</button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{ fontSize: '11px', fontWeight: '900', color: activeTab === 'dashboard' ? '#172B4D' : '#6B778C', backgroundColor: activeTab === 'dashboard' ? 'white' : 'transparent', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', boxShadow: activeTab === 'dashboard' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none', transition: '0.2s' }}
            >DASHBOARD</button>
          </div>

          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                 <span style={{ fontSize: '10px', fontWeight: '900', color: '#A5ADBA' }}>BOUNDARIES:</span>
                 <input type="date" value={projectStart} onChange={e => setProjectStart(e.target.value)} style={{ fontSize: '12px', padding: '8px 12px', border: '1px solid #DFE1E6', borderRadius: '8px', background: 'white' }} />
                 <span style={{ fontSize: '10px', fontWeight: '900', color: '#A5ADBA' }}>TO</span>
                 <input type="date" value={projectEnd} onChange={e => setProjectEnd(e.target.value)} style={{ fontSize: '12px', padding: '8px 12px', border: '1px solid #DFE1E6', borderRadius: '8px', background: 'white' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', backgroundColor: '#F4F5F7', padding: '6px', borderRadius: '10px' }}>
                <button onClick={() => setZoomUnit('days')} className="zoom-btn" style={{ background: zoomUnit === 'days' ? '#0052CC' : 'transparent', color: zoomUnit === 'days' ? 'white' : '#6B778C' }}>D</button>
                <button onClick={() => setZoomUnit('weeks')} className="zoom-btn" style={{ background: zoomUnit === 'weeks' ? '#0052CC' : 'transparent', color: zoomUnit === 'weeks' ? 'white' : '#6B778C' }}>W</button>
                <button onClick={() => setZoomUnit('months')} className="zoom-btn" style={{ background: zoomUnit === 'months' ? '#0052CC' : 'transparent', color: zoomUnit === 'months' ? 'white' : '#6B778C' }}>M</button>
                <div style={{ width: '1px', height: '16px', background: '#DFE1E6', margin: '0 4px' }} />
                <button 
                  onClick={() => { if (!tasks.length) return; setZoomUnit('days'); setZoomScale(0.3); }} 
                  style={{ fontSize: '10px', fontWeight: '900', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#36B37E', color: 'white', cursor: 'pointer', marginLeft: '4px' }}
                >FIT</button>
                <div style={{ width: '1px', height: '16px', background: '#DFE1E6', margin: '0 4px' }} />
                <button onClick={() => setZoomScale(s => Math.max(0.2, s - 0.2))} className="zoom-btn">−</button>
                <button onClick={() => setZoomScale(s => Math.min(4.0, s + 0.2))} className="zoom-btn">+</button>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px', paddingTop: '10px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {activeTab === 'timeline' && (
              <button 
                onClick={() => ganttRef.current?.exportToPng()}
                style={{ backgroundColor: '#FF8B00', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 12px rgba(255, 139, 0, 0.24)' }}
              >EXPORT PNG</button>
            )}
            <button onClick={() => setModal({ isOpen: true, type: 'phase', data: { name: '' } })} style={{ backgroundColor: '#F4F5F7', color: '#172B4D', border: '1px solid #DFE1E6', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>+ Phase</button>
            <button onClick={() => addTask()} className="btn-primary" style={{ padding: '12px 24px' }}>+ New Task</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {saveStatus === 'saving' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0052CC', animation: 'pulse 1s infinite' }} />}
            <span style={{ fontSize: '11px', fontWeight: '700', color: saveStatus === 'error' ? '#FF5630' : '#6B778C' }}>
              {saveStatus === 'saving' ? 'SYNCING...' : saveStatus === 'saved' ? '✓ SYNCED ATOMICALLY' : saveStatus === 'error' ? 'SYNC ERROR' : 'READY'}
            </span>
            <button 
              onClick={loadData} 
              disabled={isReloading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '10px', fontWeight: '900', border: '1px solid #DFE1E6', borderRadius: '6px', backgroundColor: isReloading ? '#F4F5F7' : 'white', color: '#0052CC', cursor: isReloading ? 'not-allowed' : 'pointer', marginLeft: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: '0.2s' }}
              title="Re-fetch latest roadmap data"
            >
              {isReloading && <div className="button-spinner" style={{ width: '10px', height: '10px', border: '2px solid #0052CC', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
              {isReloading ? 'RELOADING...' : 'RELOAD'}
            </button>
          </div>
        </div>
      </div>
      
      <div className={isReloading ? 'reload-overlay-active' : ''} style={{ position: 'relative' }}>
        {activeTab === 'timeline' ? (
          <GanttChart 
            ref={ganttRef}
            tasks={tasks} 
            phases={phases}
            chartHeight={chartHeight}
            projectStart={projectStart}
            projectEnd={projectEnd}
            zoomScale={zoomScale}
            zoomUnit={zoomUnit}
            onUpdateTask={updateTask} 
            onDeleteTask={id => setTasks(tasks.filter(t => t.id !== id))}
            onAddTask={addTask}
            onMoveTask={moveTask}
            onMovePhase={movePhase}
            onUpdateHeight={setChartHeight}
            isReloading={isReloading}
          />
        ) : (
          <Dashboard tasks={tasks} phases={phases} isReloading={isReloading} />
        )}
      </div>

      <Modal 
        isOpen={modal.isOpen} 
        title={modal.type === 'phase' ? 'New Phase Title' : 'Edit Item'} 
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={() => {
          if (modal.type === 'phase' && modal.data.name) {
            if (!phases.includes(modal.data.name)) setPhases([...phases, modal.data.name]);
          }
          setModal({ ...modal, isOpen: false });
        }}
      >
        <input 
          autoFocus
          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #DFE1E6', fontSize: '14px' }}
          placeholder="Type here..." 
          value={modal.data.name || ''} 
          onChange={e => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })}
          onKeyDown={e => { if (e.key === 'Enter') {
            if (modal.type === 'phase' && modal.data.name) {
              if (!phases.includes(modal.data.name)) setPhases([...phases, modal.data.name]);
            }
            setModal({ ...modal, isOpen: false });
          }}}
        />
      </Modal>
    </div>
  );
}

export default App;
