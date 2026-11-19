// ============================================================================
// BusinessHub Enterprise - FinancialService
// Real-time Profit & Loss, Cost of Goods Sold, and financial intelligence
// ============================================================================

import { IFinancialService } from '@/types';

export class FinancialService implements IFinancialService {
  constructor(private db: D1Database) {}

  async getProfitAndLoss(startDate: string, endDate: string): Promise<{
    grossRevenuePaise: number;
    salesReturnsPaise: number;
    netRevenuePaise: number;
    cogsPaise: number;
    grossProfitPaise: number;
    grossMarginPercent: number;
    operatingExpensesPaise: number;
    netOperatingIncomePaise: number;
    netMarginPercent: number;
  }> {
    // 1. Gross Revenue = SUM(sales_invoices.subtotal_paise) where status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')
    const salesRes = await this.db
      .prepare(
        `SELECT COALESCE(SUM(subtotal_paise), 0) as gross_revenue
         FROM sales_invoices
         WHERE invoice_date >= ? AND invoice_date <= ?
           AND status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')`
      )
      .bind(startDate, endDate)
      .first<{ gross_revenue: number }>();

    const grossRevenuePaise = salesRes?.gross_revenue || 0;

    // 2. Sales Returns
    const returnsRes = await this.db
      .prepare(
        `SELECT COALESCE(SUM(taxable_amount_paise), 0) as returns_total
         FROM credit_notes
         WHERE note_date >= ? AND note_date <= ?`
      )
      .bind(startDate, endDate)
      .first<{ returns_total: number }>();

    const salesReturnsPaise = returnsRes?.returns_total || 0;
    const netRevenuePaise = grossRevenuePaise - salesReturnsPaise;

    // 3. Cost of Goods Sold (COGS) derived from actual outward dispatches
    const cogsRes = await this.db
      .prepare(
        `SELECT COALESCE(SUM(ABS(quantity_milli_units) * unit_cost_paise / 1000), 0) as cogs
         FROM inventory_movements
         WHERE created_at >= ? AND created_at <= ?
           AND movement_type IN ('SALE_DISPATCH', 'DAMAGE_WRITE_OFF')`
      )
      .bind(startDate + 'T00:00:00Z', endDate + 'T23:59:59Z')
      .first<{ cogs: number }>();

    const cogsPaise = cogsRes?.cogs || 0;
    const grossProfitPaise = netRevenuePaise - cogsPaise;
    const grossMarginPercent = netRevenuePaise > 0 ? parseFloat(((grossProfitPaise / netRevenuePaise) * 100).toFixed(2)) : 0;

    // 4. Operating Expenses
    const expRes = await this.db
      .prepare(
        `SELECT COALESCE(SUM(amount_paise), 0) as total_expenses
         FROM expenses
         WHERE expense_date >= ? AND expense_date <= ?`
      )
      .bind(startDate, endDate)
      .first<{ total_expenses: number }>();

    const operatingExpensesPaise = expRes?.total_expenses || 0;
    const netOperatingIncomePaise = grossProfitPaise - operatingExpensesPaise;
    const netMarginPercent = netRevenuePaise > 0 ? parseFloat(((netOperatingIncomePaise / netRevenuePaise) * 100).toFixed(2)) : 0;

    return {
      grossRevenuePaise,
      salesReturnsPaise,
      netRevenuePaise,
      cogsPaise,
      grossProfitPaise,
      grossMarginPercent,
      operatingExpensesPaise,
      netOperatingIncomePaise,
      netMarginPercent,
    };
  }
}
