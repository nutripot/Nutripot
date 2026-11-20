import React from 'react';
import { tokens } from '../../styles/tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: tokens.colors.primary[600],
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'secondary':
        return {
          backgroundColor: '#ffffff',
          color: tokens.colors.slate[700],
          border: `1px solid ${tokens.colors.slate[300]}`,
        };
      case 'danger':
        return {
          backgroundColor: tokens.colors.danger[600],
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: tokens.colors.slate[600],
          border: '1px solid transparent',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
          fontSize: tokens.typography.fontSize.xs,
          height: '28px',
        };
      case 'md':
        return {
          padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
          fontSize: tokens.typography.fontSize.sm,
          height: '36px',
        };
      case 'lg':
        return {
          padding: `${tokens.spacing[3]} ${tokens.spacing[5]}`,
          fontSize: tokens.typography.fontSize.base,
          height: '44px',
        };
    }
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.sans,
    borderRadius: tokens.borderRadius.md,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out',
    outline: 'none',
    ...getSizeStyles(),
    ...getVariantStyles(),
    ...style,
  };

  return (
    <button disabled={disabled || isLoading} style={baseStyles} {...props}>
      {isLoading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: tokens.spacing[2] }}>
          <span
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.75s linear infinite',
            }}
          />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};
