import React from 'react';
import { tokens } from '../../styles/tokens';
import { Button } from '../ui/Button';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: tokens.spacing[6],
        paddingBottom: tokens.spacing[4],
        borderBottom: `1px solid ${tokens.colors.slate[200]}`,
        fontFamily: tokens.typography.fontFamily.sans,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: tokens.typography.fontSize['2xl'],
            fontWeight: tokens.typography.fontWeight.bold,
            color: tokens.colors.slate[900],
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: `${tokens.spacing[1]} 0 0 0`,
              fontSize: tokens.typography.fontSize.sm,
              color: tokens.colors.slate[500],
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: tokens.spacing[3] }}>
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="secondary" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
