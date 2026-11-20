import React from 'react';
import { NavLink } from 'react-router-dom';
import { tokens } from '../../styles/tokens';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  label: string;
  path: string;
  icon: (color: string) => React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      label: 'Products',
      path: '/products',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      label: 'Inventory',
      path: '/inventory',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      label: 'Purchases',
      path: '/purchases',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      label: 'Suppliers',
      path: '/suppliers',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <polyline points="17 11 19 13 23 9" />
        </svg>
      ),
    },
    {
      label: 'Sales',
      path: '/sales',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Customers',
      path: '/customers',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Collections',
      path: '/collections',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Expenses',
      path: '/expenses',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: (c) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: tokens.colors.slate[900],
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        boxShadow: tokens.shadows.md,
        userSelect: 'none',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: `${tokens.spacing[4]} ${tokens.spacing[4]}`,
          borderBottom: `1px solid ${tokens.colors.slate[800]}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[3],
          }}
        >
          <img
            src="/logo.png"
            alt="SS Nutripot"
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'contain',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              padding: '2px',
              boxShadow: tokens.shadows.sm,
            }}
          />
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.base,
                fontWeight: tokens.typography.fontWeight.bold,
                letterSpacing: '0.02em',
                color: '#ffffff',
                lineHeight: 1.2,
              }}
            >
              SS NUTRIPOT
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xs,
                color: tokens.colors.primary[200],
                marginTop: '2px',
              }}
            >
              Natural Nutrition
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: `${tokens.spacing[3]} ${tokens.spacing[2]}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[3],
              padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
              borderRadius: tokens.borderRadius.md,
              color: isActive ? '#ffffff' : tokens.colors.slate[300],
              backgroundColor: isActive ? tokens.colors.primary[600] : 'transparent',
              textDecoration: 'none',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: isActive
                ? tokens.typography.fontWeight.semibold
                : tokens.typography.fontWeight.normal,
              transition: 'background-color 0.15s ease-in-out, color 0.15s ease-in-out',
            })}
          >
            {({ isActive }) => (
              <>
                {item.icon(isActive ? '#ffffff' : tokens.colors.slate[400])}
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Info & Footer */}
      {user && (
        <div
          style={{
            padding: tokens.spacing[4],
            borderTop: `1px solid ${tokens.colors.slate[800]}`,
            backgroundColor: tokens.colors.slate[800],
          }}
        >
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              color: '#ffffff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.fullName}
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.primary[500],
              marginTop: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {user.role}
          </div>
        </div>
      )}
    </aside>
  );
};
