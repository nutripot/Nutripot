// ============================================================================
// BusinessHub Enterprise - SummaryCard Component
// High-level financial metric card for KPI dashboards
// ============================================================================

import React from 'react';
import { tokens } from '../../styles/tokens';

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
    default: tokens.colors.primary[600],
    primary: tokens.colors.primary[600],
    success: tokens.colors.success[600],
    warning: tokens.colors.warning[600],
    danger: tokens.colors.danger[600],
  }[variant];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: tokens.borderRadius.lg,
        padding: '20px',
        border: `1px solid ${tokens.colors.slate[200]}`,
        borderTop: `4px solid ${accentBorder}`,
        boxShadow: tokens.shadows.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: tokens.colors.slate[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </div>

      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: tokens.colors.slate[800], letterSpacing: '-0.02em' }}>
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
