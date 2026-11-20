// ============================================================================
// BusinessHub Enterprise - QuantityInput Component
// Accepts and emits integer milli-units (1.000 = 1000); displays decimal units
// ============================================================================

import React from 'react';
import { milliUnitsToUnits, unitsToMilliUnits } from '@/utils/quantity';

interface QuantityInputProps {
  id: string;
  valueMilliUnits: number;
  onChangeMilliUnits: (newMilliUnits: number) => void;
  uom?: string;
  disabled?: boolean;
  minMilliUnits?: number;
  hasError?: boolean;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  id,
  valueMilliUnits,
  onChangeMilliUnits,
  uom,
  disabled,
  minMilliUnits = 0,
  hasError,
}) => {
  const displayVal = valueMilliUnits > 0 ? milliUnitsToUnits(valueMilliUnits).toString() : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChangeMilliUnits(0);
      return;
    }
    const parsed = unitsToMilliUnits(raw);
    if (!isNaN(parsed) && parsed >= minMilliUnits) {
      onChangeMilliUnits(parsed);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: `1px solid ${hasError ? '#e11d48' : '#cbd5e1'}`,
        borderRadius: '6px',
        backgroundColor: disabled ? '#f8fafc' : '#ffffff',
        overflow: 'hidden',
      }}
    >
      <input
        id={id}
        type="number"
        step="0.001"
        min={minMilliUnits / 1000}
        value={displayVal}
        disabled={disabled}
        placeholder="0.000"
        onChange={handleChange}
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
      {uom && (
        <span
          style={{
            padding: '8px 12px',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            fontWeight: 600,
            fontSize: '0.75rem',
            borderLeft: '1px solid #cbd5e1',
            textTransform: 'uppercase',
            userSelect: 'none',
          }}
        >
          {uom}
        </span>
      )}
    </div>
  );
};
