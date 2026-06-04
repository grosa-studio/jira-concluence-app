import { differenceInCalendarDays, parseISO } from 'date-fns';

function duration(task) {
  return Math.max(1, differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate)) + 1);
}

function topologicalSort(tasks) {
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));
  const inDegree = Object.fromEntries(tasks.map(t => [t.id, 0]));
  const successors = Object.fromEntries(tasks.map(t => [t.id, []]));

  tasks.forEach(t => {
    (t.dependsOn || []).forEach(predId => {
      if (taskMap[predId]) {
        inDegree[t.id]++;
        successors[predId].push(t.id);
      }
    });
  });

  const queue = tasks.filter(t => inDegree[t.id] === 0).map(t => t.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    successors[id].forEach(succId => {
      inDegree[succId]--;
      if (inDegree[succId] === 0) queue.push(succId);
    });
  }

  return { order, successors, hasCycle: order.length !== tasks.length };
}

export function computeCriticalPath(tasks) {
  if (!tasks || tasks.length === 0) return tasks;

  const { order, successors, hasCycle } = topologicalSort(tasks);
  if (hasCycle) {
    return tasks.map(t => ({ ...t, isCritical: false, float: Infinity }));
  }

  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));
  const dur = Object.fromEntries(tasks.map(t => [t.id, duration(t)]));
  const ef = {};
  const es = {};

  // Forward pass
  order.forEach(id => {
    const preds = (taskMap[id].dependsOn || []).filter(p => taskMap[p]);
    es[id] = preds.length ? Math.max(...preds.map(p => ef[p] ?? 0)) : 0;
    ef[id] = es[id] + dur[id];
  });

  const projectDuration = Math.max(...Object.values(ef));
  const lf = {};
  const ls = {};

  // Backward pass
  [...order].reverse().forEach(id => {
    const succs = successors[id];
    lf[id] = succs.length ? Math.min(...succs.map(s => ls[s])) : projectDuration;
    ls[id] = lf[id] - dur[id];
  });

  return tasks.map(t => ({
    ...t,
    isCritical: (lf[t.id] - ef[t.id]) === 0,
    float: ls[t.id] - es[t.id],
  }));
}
