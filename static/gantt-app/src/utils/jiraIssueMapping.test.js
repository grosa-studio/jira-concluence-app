import { describe, test, expect } from 'vitest';
import { statusToProgress, extractBlockedBy, STATUS_PROGRESS } from './jiraIssueMapping';

describe('statusToProgress', () => {
  test('maps To Do to 0', () => {
    expect(statusToProgress('To Do')).toBe(0);
  });
  test('maps Done to 100', () => {
    expect(statusToProgress('Done')).toBe(100);
  });
  test('maps In Progress to 50', () => {
    expect(statusToProgress('In Progress')).toBe(50);
  });
  test('returns 0 for unknown status', () => {
    expect(statusToProgress('Custom Status XYZ')).toBe(0);
  });
  test('returns 0 for empty string', () => {
    expect(statusToProgress('')).toBe(0);
  });
});

describe('extractBlockedBy', () => {
  test('returns empty array for no links', () => {
    expect(extractBlockedBy([])).toEqual([]);
  });
  test('returns empty array for null', () => {
    expect(extractBlockedBy(null)).toEqual([]);
  });
  test('extracts blocked-by links', () => {
    const links = [{
      type: { inward: 'is blocked by', outward: 'blocks' },
      inwardIssue: { key: 'PROJ-1' },
    }];
    expect(extractBlockedBy(links)).toContain('PROJ-1');
  });
  test('ignores unrelated link types', () => {
    const links = [{
      type: { inward: 'relates to', outward: 'relates to' },
      inwardIssue: { key: 'PROJ-2' },
    }];
    expect(extractBlockedBy(links)).toEqual([]);
  });
});
