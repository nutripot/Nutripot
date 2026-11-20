// ============================================================================
// BusinessHub Enterprise - StatusBadge Component
// Semantic high-contrast status indicator badge (no decorative emojis)
// ============================================================================

import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  label?: string;
  status?: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; border: string }> = {
  success: {
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
  },
  warning: {
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fde68a',
  },
  danger: {
    bg: '#fff1f2',
    text: '#be123c',
    border: '#fecdd3',
  },
  info: {
    bg: '#f0f9ff',
    text: '#0369a1',
    border: '#bae6fd',
  },
  neutral: {
    bg: '#f8fafc',
    text: '#475569',
    border: '#e2e8f0',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  status,
  variant = 'neutral',
  size = 'md',
}) => {
  const textLabel = label || status || '';
  const style = variantStyles[variant];
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? '0.75rem' : '0.8125rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: '4px',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        letterSpacing: '0.025em',
        textTransform: 'uppercase',
      }}
    >
      {textLabel}
    </span>
  );
};
