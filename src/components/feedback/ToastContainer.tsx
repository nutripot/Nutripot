import React from 'react';
import { ToastMessage } from '../../hooks/useToast';
import { tokens } from '../../styles/tokens';

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const getTypeStyles = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return {
          borderLeft: `4px solid ${tokens.colors.success[600]}`,
          bg: tokens.colors.success[50],
          titleColor: tokens.colors.success[700],
        };
      case 'danger':
        return {
          borderLeft: `4px solid ${tokens.colors.danger[600]}`,
          bg: tokens.colors.danger[50],
          titleColor: tokens.colors.danger[700],
        };
      case 'warning':
        return {
          borderLeft: `4px solid ${tokens.colors.warning[600]}`,
          bg: tokens.colors.warning[50],
          titleColor: tokens.colors.warning[700],
        };
      case 'info':
      default:
        return {
          borderLeft: `4px solid ${tokens.colors.info[600]}`,
          bg: tokens.colors.info[50],
          titleColor: tokens.colors.info[700],
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: tokens.spacing[4],
        right: tokens.spacing[4],
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[2],
        maxWidth: '380px',
        width: '100%',
        fontFamily: tokens.typography.fontFamily.sans,
      }}
    >
      {toasts.map((toast) => {
        const style = getTypeStyles(toast.type);
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
              backgroundColor: '#ffffff',
              borderRadius: tokens.borderRadius.md,
              boxShadow: tokens.shadows.lg,
              border: `1px solid ${tokens.colors.slate[200]}`,
              borderLeft: style.borderLeft,
            }}
          >
            <div style={{ flex: 1, marginRight: tokens.spacing[2] }}>
              <div
                style={{
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.semibold,
                  color: style.titleColor,
                }}
              >
                {toast.title}
              </div>
              {toast.message && (
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.xs,
                    color: tokens.colors.slate[600],
                    marginTop: tokens.spacing[1],
                  }}
                >
                  {toast.message}
                </div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: tokens.colors.slate[400],
                padding: 0,
                fontSize: tokens.typography.fontSize.base,
                lineHeight: 1,
              }}
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};
