import React from 'react';
import { avatarColor, initials } from '../tokens';

export function UserAvatar({ user, size = 28 }) {
  if (!user) return null;
  const bg = avatarColor(user.accountId);
  return (
    <div
      title={user.displayName}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: bg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.36), fontWeight: 700, flexShrink: 0,
        border: '2px solid var(--ds-surface-raised, #fff)',
        userSelect: 'none',
      }}
    >
      {initials(user.displayName)}
    </div>
  );
}
