import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { tokens } from '../../styles/tokens';
import { Button } from '../ui/Button';

export const TopNavigation: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: '#ffffff',
        borderBottom: `1px solid ${tokens.colors.slate[200]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${tokens.spacing[6]}`,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: tokens.shadows.sm,
        fontFamily: tokens.typography.fontFamily.sans,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginRight: tokens.spacing[2] }}>
          <img
            src="/logo.png"
            alt="SS Nutripot"
            style={{
              width: '28px',
              height: '28px',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
          />
          <span
            style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.primary[700],
              letterSpacing: '0.03em',
            }}
          >
            SS NUTRIPOT
          </span>
        </div>
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.semibold,
            backgroundColor: tokens.colors.primary[50],
            color: tokens.colors.primary[700],
            border: `1px solid ${tokens.colors.primary[200]}`,
            padding: `2px ${tokens.spacing[2]}`,
            borderRadius: tokens.borderRadius.sm,
            letterSpacing: '0.05em',
          }}
        >
          FY 2026-27
        </span>
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.medium,
            backgroundColor: tokens.colors.success[50],
            color: tokens.colors.success[700],
            padding: `2px ${tokens.spacing[2]}`,
            borderRadius: tokens.borderRadius.sm,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: tokens.colors.success[600],
            }}
          />
          System Active
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              color: tokens.colors.slate[800],
            }}
          >
            {user?.email}
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.slate[500],
            }}
          >
            INR Base Currency (₹)
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={() => logout()}>
          Sign Out
        </Button>
      </div>
    </header>
  );
};
