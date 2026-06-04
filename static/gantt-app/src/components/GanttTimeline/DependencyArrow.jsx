import React from 'react';
import { tokens, GANTT } from '../../tokens';

const BAR_H = 24;
const BAR_MARGIN = (GANTT.ROW_HEIGHT - BAR_H) / 2;

export function DependencyArrow({ fromX, fromY, toX, toY, isCritical }) {
  const midFromY = fromY + BAR_MARGIN + BAR_H / 2;
  const midToY = toY + BAR_MARGIN + BAR_H / 2;
  const ctrl = Math.max(20, Math.abs(toX - fromX) * 0.4);

  const d = `M ${fromX} ${midFromY} C ${fromX + ctrl} ${midFromY} ${toX - ctrl} ${midToY} ${toX} ${midToY}`;
  const color = isCritical ? tokens.iconDanger : tokens.borderBold;

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
    </g>
  );
}
