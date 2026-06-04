import { useMemo } from 'react';
import { computeCriticalPath } from '../utils/criticalPath';

export function useCriticalPath(tasks) {
  return useMemo(() => computeCriticalPath(tasks), [tasks]);
}
