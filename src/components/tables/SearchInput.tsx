// ============================================================================
// BusinessHub Enterprise - SearchInput Component
// Debounced table search field with clear action
// ============================================================================

import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search records...',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        padding: '0 12px',
        width: '100%',
        maxWidth: '320px',
      }}
    >
      <span style={{ color: '#94a3b8', marginRight: '8px', fontSize: '0.875rem' }}>🔍</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          padding: '8px 0',
          border: 'none',
          outline: 'none',
          fontSize: '0.875rem',
          color: '#0f172a',
          backgroundColor: 'transparent',
          fontFamily: 'inherit',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
            fontSize: '0.875rem',
            padding: '4px',
          }}
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};
