import React from 'react';
import { tokens } from '../../styles/tokens';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
          fontSize: tokens.typography.fontSize.sm,
          fontFamily: tokens.typography.fontFamily.sans,
          color: tokens.colors.slate[800],
          backgroundColor: '#ffffff',
          border: `1px solid ${error ? tokens.colors.danger[600] : tokens.colors.slate[300]}`,
          borderRadius: tokens.borderRadius.md,
          outline: 'none',
          transition: 'border-color 0.15s ease-in-out',
          ...style,
        }}
        {...props}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
