// ============================================================================
// BusinessHub Enterprise - useCurrency Hook
// Currency conversions and formatting between integer paise and Indian Rupees
// ============================================================================

import { useMemo } from 'react';
import { formatPaiseToRupees, rupeesToPaise } from '@/utils/currency';

export function useCurrency() {
  return useMemo(() => ({
    format: (paise: number) => formatPaiseToRupees(paise),
    parse: (rupeesStr: string | number) => rupeesToPaise(rupeesStr),
  }), []);
}
