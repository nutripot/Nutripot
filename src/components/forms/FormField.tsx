// ============================================================================
// BusinessHub Enterprise - FormField Component
// Accessible label, input slot, error notice, and helper text
// ============================================================================

import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required,
  error,
  hint,
  children,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
      <label
        htmlFor={id}
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#334155',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {label}
        {required && <span style={{ color: '#e11d48' }}>*</span>}
      </label>

      {children}

      {hint && !error && (
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{hint}</span>
      )}

      {error && (
        <span style={{ fontSize: '0.75rem', color: '#e11d48', fontWeight: 500 }}>{error}</span>
      )}
    </div>
  );
};
