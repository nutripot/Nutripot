// ============================================================================
// BusinessHub Enterprise Management System - Quantity Utilities
// All quantities are represented in integer milli-units (1.000 Unit = 1000).
// ============================================================================

/**
 * Converts integer milli-units to a decimal unit number.
 * Example: 2500 -> 2.5
 */
export function milliUnitsToUnits(milliUnits: number): number {
  return milliUnits / 1000;
}

/**
 * Converts a decimal unit number to integer milli-units.
 * Example: 2.5 -> 2500
 */
export function unitsToMilliUnits(units: number | string): number {
  const num = typeof units === 'string' ? parseFloat(units) : units;
  if (isNaN(num)) return 0;
  return Math.round(num * 1000);
}

/**
 * Formats integer milli-units into a display string with appropriate decimal precision.
 * Example: 2500 -> "2.5", 1000 -> "1", 1250 -> "1.25"
 */
export function formatQuantity(milliUnits: number, uom?: string): string {
  const units = milliUnits / 1000;
  const formatted = parseFloat(units.toFixed(3)).toString();
  return uom ? `${formatted} ${uom}` : formatted;
}
