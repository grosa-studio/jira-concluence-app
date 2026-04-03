import React from 'react';

const Modal = ({ isOpen, title, onClose, onConfirm, children }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(9, 30, 66, 0.54)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%',
        padding: '24px',
        boxShadow: '0 20px 66px rgba(9, 30, 66, 0.25)',
        border: '1px solid #DFE1E6'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: '#172B4D' }}>{title}</h3>
        <div style={{ marginBottom: '24px' }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', border: 'none', color: '#42526E', padding: '8px 16px', 
              borderRadius: '4px', cursor: 'pointer', fontWeight: '700' 
            }}
          >Cancel</button>
          <button 
            onClick={onConfirm}
            style={{ 
              background: '#0052CC', color: 'white', border: 'none', padding: '8px 24px', 
              borderRadius: '4px', cursor: 'pointer', fontWeight: '800',boxShadow: '0 4px 12px rgba(0, 82, 204, 0.2)'
            }}
          >Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
