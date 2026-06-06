import React from 'react';
import { tokens } from '../../tokens';

export function DependencyArrow({ fromX, fromY, toX, toY, isCritical, rowH = 52, barH = 24, type = 'FS', lag = 0 }) {
  const midFromY = fromY + rowH / 2;
  const midToY = toY + rowH / 2;
  const ctrl = Math.max(20, Math.abs(toX - fromX) * 0.4);

  const d = `M ${fromX} ${midFromY} C ${fromX + ctrl} ${midFromY} ${toX - ctrl} ${midToY} ${toX} ${midToY}`;
  const color = isCritical ? tokens.iconDanger : tokens.borderBold;

  const lx = (fromX + toX) / 2;
  const ly = (midFromY + midToY) / 2;
  const label = `${type}${lag > 0 ? '+' + lag : lag < 0 ? lag : ''}`;
  const labelW = label.length * 5.5 + 8;

  return (
    <g pointerEvents="none">
      <defs>
        <marker id={`arrow-${isCritical ? 'crit' : 'normal'}`} markerWidth="6" markerHeight="6"
          refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={color} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={isCritical ? 1.8 : 1.2}
        strokeDasharray={isCritical ? 'none' : '4 2'}
        markerEnd={`url(#arrow-${isCritical ? 'crit' : 'normal'})`}
        opacity="0.7"
      />
      <rect x={lx - labelW / 2} y={ly - 7} width={labelW} height={14} rx={3}
        fill={tokens.surfaceRaised} stroke={color} strokeWidth="0.75" opacity="0.96" />
      <text x={lx} y={ly + 3} fontSize="8" fontWeight="700" textAnchor="middle" fill={color}>{label}</text>
    </g>
  );
}
