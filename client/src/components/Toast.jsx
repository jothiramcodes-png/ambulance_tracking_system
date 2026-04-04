import { useState, useCallback } from 'react';

const toasts = new Set();
let setToastsGlobal = null;

export function ToastContainer() {
  const [items, setItems] = useState([]);
  setToastsGlobal = setItems;

  return (
    <div className="toast-container">
      {items.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.icon}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function toast(message, type = 'info', icon = '💬') {
  if (!setToastsGlobal) return;
  const id = Date.now();
  const icons = { error: '❌', success: '✅', info: 'ℹ️' };
  setToastsGlobal(prev => [...prev, { id, message, type, icon: icon || icons[type] }]);
  setTimeout(() => {
    setToastsGlobal(prev => prev.filter(t => t.id !== id));
  }, 4000);
}
