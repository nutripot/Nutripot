// ============================================================================
// BusinessHub Enterprise Management System - Currency Utilities
// All monetary values in core systems are represented as integer paise.
// (1 INR = 100 paise; e.g. 1545050 paise = ₹15,450.50)
// ============================================================================

/**
 * Formats an integer paise amount into standard Indian Rupee currency format.
 * Example: 1545050 -> "₹15,450.50"
 */
export function formatPaiseToRupees(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;
  
  const formattedPaise = remainderPaise.toString().padStart(2, '0');
  
  // Format rupees with Indian Numbering System (e.g. 12,34,567)
  const rupeesStr = rupees.toString();
  let lastThree = rupeesStr.substring(rupeesStr.length - 3);
  const otherNumbers = rupeesStr.substring(0, rupeesStr.length - 3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedRupees = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  
  const sign = isNegative ? '-' : '';
  return `${sign}₹${formattedRupees}.${formattedPaise}`;
}

/**
 * Converts a decimal rupee string or number to integer paise with exact rounding.
 * Example: 154.50 -> 15450
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/[₹,\s]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }
  return Math.round(rupees * 100);
}

/**
 * Calculates GST Tax Amount in integer paise.
 * In intra-state supplies, tax is split into CGST and SGST.
 * If total tax is odd, the extra 1 paisa is assigned to CGST.
 */
export function calculateGstTax(taxablePaise: number, taxRateBps: number, isIntraState: boolean) {
  const totalTaxPaise = Math.round((taxablePaise * taxRateBps) / 10000);
  
  if (isIntraState) {
    const cgstPaise = Math.ceil(totalTaxPaise / 2);
    const sgstPaise = totalTaxPaise - cgstPaise;
    return {
      taxablePaise,
      cgstPaise,
      sgstPaise,
      igstPaise: 0,
      totalTaxPaise,
      grandTotalPaise: taxablePaise + totalTaxPaise
    };
  } else {
    return {
      taxablePaise,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: totalTaxPaise,
      totalTaxPaise,
      grandTotalPaise: taxablePaise + totalTaxPaise
    };
  }
}
