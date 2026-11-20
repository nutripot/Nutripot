// ============================================================================
// BusinessHub Enterprise - useToast Hook & Notification Types
// ============================================================================

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev: ToastMessage[]) => prev.filter((t: ToastMessage) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, durationMs = 4000) => {
    const id = 'tst_' + Date.now() + Math.random().toString(36).slice(2, 6);
    const newToast: ToastMessage = { id, type, title, message, durationMs };

    setToasts((prev: ToastMessage[]) => [...prev, newToast]);

    if (durationMs > 0) {
      setTimeout(() => {
        removeToast(id);
      }, durationMs);
    }
  }, [removeToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success: (title: string, message?: string) => addToast('success', title, message),
    error: (title: string, message?: string) => addToast('danger', title, message),
    warning: (title: string, message?: string) => addToast('warning', title, message),
    info: (title: string, message?: string) => addToast('info', title, message),
  };
}
