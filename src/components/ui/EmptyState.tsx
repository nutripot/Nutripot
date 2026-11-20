import React from 'react';
import { tokens } from '../../styles/tokens';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${tokens.spacing[8]} ${tokens.spacing[4]}`,
        textAlign: 'center',
        backgroundColor: '#ffffff',
        border: `1px dashed ${tokens.colors.slate[300]}`,
        borderRadius: tokens.borderRadius.lg,
        fontFamily: tokens.typography.fontFamily.sans,
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: tokens.colors.slate[100],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: tokens.spacing[3],
          color: tokens.colors.slate[400],
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: tokens.typography.fontSize.base,
          fontWeight: tokens.typography.fontWeight.semibold,
          color: tokens.colors.slate[800],
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: `${tokens.spacing[1]} 0 ${actionLabel ? tokens.spacing[4] : 0}`,
          fontSize: tokens.typography.fontSize.sm,
          color: tokens.colors.slate[500],
          maxWidth: '360px',
        }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
