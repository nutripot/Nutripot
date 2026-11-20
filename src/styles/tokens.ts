// ============================================================================
// SS Nutripot - Design Tokens
// Warm organic palette inspired by SS Nutripot terracotta pot & grain logo
// ============================================================================

export const tokens = {
  colors: {
    // Brand & Primary (Warm Terracotta & Rich Earthen Brown)
    primary: {
      50: '#FBF7F3',   // Cashew cream
      100: '#F4ECE4',  // Toasted almond
      200: '#E6D5C5',  // Almond latte
      500: '#9E5326',  // Roasted hazelnut
      600: '#7A3B1C',  // Signature Pot Terracotta (Primary Button & Nav)
      700: '#5C2C16',  // Deep Terracotta (Active / Brand)
      800: '#46200F',  // Dark Roast
      900: '#321509',  // Deep Espresso
    },
    // Neutrals & Surface (Warm Stone & Earthen Slate)
    slate: {
      50: '#FAF8F5',   // Canvas background
      100: '#F2ECE5',  // Input / light card surface
      200: '#E4DAD0',  // Borders & Dividers
      300: '#D0C2B4',  // Accent border
      400: '#A49384',  // Placeholder text
      500: '#7A6B5E',  // Muted secondary text
      600: '#5A4C41',  // Body text
      700: '#42362E',  // Dark text
      800: '#2E241E',  // Dark panels
      900: '#1F1713',  // Sidebar background (Deep Earthen Umber)
    },
    // Semantic Status Colors
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      600: '#16A34A', // Botanical green
      700: '#15803D',
    },
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      600: '#D97706', // Golden amber
      700: '#B45309',
    },
    danger: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      600: '#DC2626', // Crimson red
      700: '#B91C1C',
    },
    info: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      600: '#7C3AED',
      700: '#6D28D9',
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
