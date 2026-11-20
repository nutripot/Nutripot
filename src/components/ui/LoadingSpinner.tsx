import React from 'react';
import { tokens } from '../../styles/tokens';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label = 'Loading...' }) => {
  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return 16;
      case 'lg':
        return 36;
      case 'md':
      default:
        return 24;
    }
  };

  const dim = getDimensions();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing[6],
        gap: tokens.spacing[2],
        color: tokens.colors.slate[500],
        fontFamily: tokens.typography.fontFamily.sans,
        fontSize: tokens.typography.fontSize.sm,
      }}
    >
      <div
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          border: `2px solid ${tokens.colors.slate[200]}`,
          borderTopColor: tokens.colors.primary[600],
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      {label && <span>{label}</span>}
    </div>
  );
};
