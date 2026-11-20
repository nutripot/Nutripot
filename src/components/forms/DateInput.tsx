import React from 'react';
import { tokens } from '../../styles/tokens';

export interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ error, style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="date"
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
          ...style,
        }}
        {...props}
      />
    );
  }
);

DateInput.displayName = 'DateInput';
