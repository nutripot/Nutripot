import React from 'react';
import { tokens } from '../../styles/tokens';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: boolean;
  placeholder?: string;
}

export const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ options, error, placeholder, style, ...props }, ref) => {
    return (
      <select
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
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);

SelectInput.displayName = 'SelectInput';
