import React from 'react';
import { tokens, GANTT } from '../tokens';

// Loading skeleton that mirrors the real layout (header + sidebar + timeline),
// so the first paint reads as "the Gantt is loading" rather than a blank box.
// Uses the .skeleton-pulse animation from index.css.

const ROWS = [
  { sx: 5, sw: 60, bx: 4, bw: 32 },
  { sx: 5, sw: 42, bx: 18, bw: 26 },
  { sx: 5, sw: 70, bx: 30, bw: 40 },
  { sx: 5, sw: 50, bx: 12, bw: 22 },
  { sx: 5, sw: 64, bx: 44, bw: 30 },
  { sx: 5, sw: 38, bx: 26, bw: 18 },
  { sx: 5, sw: 56, bx: 8, bw: 36 },
  { sx: 5, sw: 48, bx: 50, bw: 28 },
];

function Block({ width, height, radius = tokens.radius.sm, style }) {
  return (
    <div className="skeleton-pulse" style={{
      width, height, borderRadius: radius, background: tokens.bgNeutral, flexShrink: 0, ...style,
    }} />
  );
}

export function GanttSkeleton({ fullscreen }) {
  return (
    <div className={`gantt-app${fullscreen ? ' gantt-app--fullscreen' : ''}`} aria-busy="true">
      {/* Header */}
      <div style={{
        height: 52, flexShrink: 0, background: tokens.surfaceRaised,
        borderBottom: `1px solid ${tokens.border}`,
        display: 'flex', alignItems: 'center', gap: tokens.spacing[3],
        padding: `0 ${tokens.spacing[4]}`,
      }}>
        <Block width={64} height={18} />
        <Block width={150} height={28} radius={tokens.radius.md} />
        <div style={{ flex: 1 }} />
        <Block width={30} height={30} radius={tokens.radius.md} />
        <Block width={88} height={30} radius={tokens.radius.md} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: GANTT.SIDEBAR_WIDTH, flexShrink: 0,
          borderRight: `1px solid ${tokens.border}`, background: tokens.surfaceRaised,
          paddingTop: GANTT.TIMELINE_HEADER_HEIGHT,
        }}>
          {ROWS.map((r, i) => (
            <div key={i} style={{
              height: GANTT.ROW_HEIGHT, display: 'flex', alignItems: 'center',
              padding: `0 ${tokens.spacing[3]}`, gap: tokens.spacing[2],
            }}>
              <Block width={`${r.sw}%`} height={12} />
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, paddingTop: GANTT.TIMELINE_HEADER_HEIGHT, overflow: 'hidden', background: tokens.surface }}>
          {ROWS.map((r, i) => (
            <div key={i} style={{ height: GANTT.ROW_HEIGHT, display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div className="skeleton-pulse" style={{
                position: 'absolute', left: `${r.bx}%`, width: `${r.bw}%`,
                height: 24, borderRadius: 12, background: tokens.bgNeutral,
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
