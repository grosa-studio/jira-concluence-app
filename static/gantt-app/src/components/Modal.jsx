import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '../tokens';

export function Modal({ isOpen, title, onClose, onConfirm, children, confirmLabel }) {
  const { t } = useTranslation();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(9,30,66,0.54)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      role="dialog" aria-modal="true" aria-labelledby="modal-title"
    >
      <div style={{
        background: tokens.surfaceRaised,
        borderRadius: tokens.radius.lg,
        boxShadow: tokens.shadow.lg,
        padding: tokens.spacing[6],
        minWidth: '340px',
        maxWidth: '480px',
        width: '100%',
      }}>
        <h2 id="modal-title" style={{ fontSize: '18px', fontWeight: 700, color: tokens.textPrimary, marginBottom: tokens.spacing[4] }}>
          {title}
        </h2>
        <div style={{ marginBottom: tokens.spacing[5] }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[2] }}>
          <button onClick={onClose} style={secondaryBtn}>{t('modal.cancel')}</button>
          <button onClick={onConfirm} style={primaryBtn}>{confirmLabel || t('modal.confirm')}</button>
        </div>
      </div>
    </div>
  );
}

const primaryBtn = {
  padding: '8px 20px', borderRadius: tokens.radius.md, border: 'none',
  background: 'var(--ds-background-brand-bold, #0052CC)', color: '#fff',
  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
};
const secondaryBtn = {
  padding: '8px 20px', borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.border}`,
  background: 'transparent', color: tokens.textPrimary,
  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};

export default Modal;
