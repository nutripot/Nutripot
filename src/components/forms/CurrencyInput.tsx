// ============================================================================
// BusinessHub Enterprise - CurrencyInput Component
// Accepts and emits integer paise values; displays formatted Indian Rupees
// ============================================================================

import React, { useState, useEffect } from 'react';
import { formatPaiseToRupees, rupeesToPaise } from '@/utils/currency';

interface CurrencyInputProps {
  id: string;
  valuePaise: number;
  onChangePaise: (newPaise: number) => void;
  disabled?: boolean;
  placeholder?: string;
  hasError?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  valuePaise,
  onChangePaise,
  disabled,
  placeholder = '0.00',
  hasError,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      if (valuePaise === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatPaiseToRupees(valuePaise).replace('₹', ''));
      }
    }
  }, [valuePaise, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const parsedPaise = rupeesToPaise(raw);
    onChangePaise(parsedPaise);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (valuePaise > 0) {
      setDisplayValue(formatPaiseToRupees(valuePaise).replace('₹', ''));
    } else {
      setDisplayValue('');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: `1px solid ${hasError ? '#e11d48' : isFocused ? '#2563eb' : '#cbd5e1'}`,
        borderRadius: '6px',
        backgroundColor: disabled ? '#f8fafc' : '#ffffff',
        overflow: 'hidden',
        boxShadow: isFocused ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      <span
        style={{
          padding: '8px 12px',
          backgroundColor: '#f1f5f9',
          color: '#475569',
          fontWeight: 600,
          fontSize: '0.875rem',
          borderRight: '1px solid #cbd5e1',
          userSelect: 'none',
        }}
      >
        ₹
      </span>
      <input
        id={id}
        type="text"
        value={displayValue}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: 'none',
          outline: 'none',
          fontSize: '0.9375rem',
          color: '#0f172a',
          backgroundColor: 'transparent',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
};
