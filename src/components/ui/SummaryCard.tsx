// ============================================================================
// BusinessHub Enterprise - SummaryCard Component
// High-level financial metric card for KPI dashboards
// ============================================================================

import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  changePercentage?: number;
  trend?: 'UP' | 'DOWN' | 'NEUTRAL';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  changePercentage,
  trend,
  variant = 'default',
}) => {
  const accentBorder = {
    default: '#2563eb', // Precision Cobalt
    primary: '#2563eb',
    success: '#059669', // Emerald
    warning: '#d97706', // Amber
    danger: '#e11d48',  // Crimson
  }[variant];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        borderTop: `4px solid ${accentBorder}`,
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </div>

      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
        {value}
      </div>

      {(subtitle || changePercentage !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
          {changePercentage !== undefined && (
            <span
              style={{
                fontWeight: 600,
                color: trend === 'UP' ? '#059669' : trend === 'DOWN' ? '#e11d48' : '#64748b',
              }}
            >
              {trend === 'UP' ? '▲' : trend === 'DOWN' ? '▼' : '•'} {Math.abs(changePercentage)}%
            </span>
          )}
          {subtitle && <span style={{ color: '#94a3b8' }}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
