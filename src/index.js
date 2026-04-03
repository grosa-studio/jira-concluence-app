import Resolver from '@forge/resolver';
import { asUser, route, storage } from '@forge/api';

const resolver = new Resolver();

const getStorageKey = (localId) => `gantt-data-v2-${localId}`;

resolver.define('getTasks', async (req) => {
  const { localId, contentId } = req.context;
  const storageKey = getStorageKey(localId);
  
  // 1. Try to load from Atomic Storage (New system)
  try {
    const data = await storage.get(storageKey);
    if (data) return data;
  } catch (err) {
    console.error("Atomic storage error:", err);
  }

  // 2. Try to load from Content Property REST (Previous system)
  try {
    const response = await asUser().requestConfluence(
      route`/wiki/rest/api/content/${contentId}/property/gantt-data-${localId}`
    );
    if (response.status === 200) {
      const prop = await response.json();
      if (prop && prop.value) return prop.value;
    }
  } catch (err) {
    console.error("Content property fallback error:", err);
  }

  // 3. Defaults
  return {
    tasks: [
      { id: '1', name: 'Strategic Planning', startDate: '2026-04-01', endDate: '2026-04-10', progress: 100, phase: 'Initial Phase', hours: 40 },
      { id: '2', name: 'Design Concepts', startDate: '2026-04-11', endDate: '2026-04-20', progress: 50, phase: 'Execution', hours: 80 }
    ],
    meta: { projectStart: '2026-04-01', projectEnd: '2026-06-30', phases: ['Initial Phase', 'Execution', 'Testing', 'Launch'] }
  };
});

resolver.define('saveTasks', async (req) => {
  const { localId, contentId } = req.context;
  const { data } = req.payload;
  const storageKey = getStorageKey(localId);

  try {
    // Save to Atomic Storage (PRIMARY)
    await storage.set(storageKey, data);

    // Save to Content Property (SECONDARY/BACKUP for page mobility)
    try {
      const restKey = `gantt-data-${localId}`;
      const existing = await asUser().requestConfluence(route`/wiki/rest/api/content/${contentId}/property/${restKey}`);
      let body = { value: data };
      if (existing.status === 200) {
        const prev = await existing.json();
        body.version = { number: prev.version.number + 1 };
        await asUser().requestConfluence(route`/wiki/rest/api/content/${contentId}/property/${restKey}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
      } else {
        await asUser().requestConfluence(route`/wiki/rest/api/content/${contentId}/property/${restKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
      }
    } catch (e) {
      console.warn("Content property backup failed, but atomic storage succeeded.");
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to save atomic storage:", err);
    return { success: false, error: err.message };
  }
});

export const handler = resolver.getDefinitions();
