// ============================================================================
// BusinessHub Enterprise - Centralized Design Tokens
// Standards: No emojis, no decorative UI, high-contrast accessible design
// ============================================================================

export const tokens = {
  colors: {
    // Brand & Primary
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb', // Precision Cobalt
      700: '#1d4ed8',
      900: '#1e3a8a',
    },
    // Neutrals & Surface
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a', // Deep Slate Navy
    },
    // Semantic Status Colors
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      600: '#059669', // Emerald (Collections / Inward Stock / Net Profit)
      700: '#047857',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      600: '#d97706', // Amber (Pending Invoices / Low Stock Alert)
      700: '#b45309',
    },
    danger: {
      50: '#fff1f2',
      100: '#ffe4e6',
      600: '#e11d48', // Rose / Crimson (Overdue / Expenses / Outward Stock)
      700: '#be123c',
    },
    info: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      600: '#0284c7', // Sky (Quotations / Drafts)
      700: '#0369a1',
    },
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px (Standard UI)
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px (Page Headings)
      '3xl': '1.875rem',// 30px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  spacing: {
    1: '0.25rem', // 4px
    2: '0.5rem',  // 8px
    3: '0.75rem', // 12px
    4: '1rem',    // 16px
    5: '1.25rem', // 20px
    6: '1.5rem',  // 24px
    8: '2rem',    // 32px
  },
  borderRadius: {
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px (Standard controls)
    lg: '0.5rem',   // 8px (Cards & Modals)
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
} as const;
