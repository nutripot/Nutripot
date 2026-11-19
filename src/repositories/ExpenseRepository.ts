// ============================================================================
// BusinessHub Enterprise - ExpenseRepository
// Cloudflare D1 operations for Operational Expenses and Categories
// ============================================================================

import { IExpenseRepository, Expense, PaymentMode } from '@/types';

export class ExpenseRepository implements IExpenseRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<Expense | null> {
    const row = await this.db
      .prepare(
        `SELECT id, voucher_number, category_id, expense_date, amount_paise,
                payment_mode, payment_account, payee_name, description, receipt_r2_key,
                tax_deduction_paise, created_at, created_by
         FROM expenses WHERE id = ?`
      )
      .bind(id)
      .first<any>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async list(params: { categoryId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<Expense[]> {
    let sql = `SELECT id, voucher_number, category_id, expense_date, amount_paise,
                      payment_mode, payment_account, payee_name, description, receipt_r2_key,
                      tax_deduction_paise, created_at, created_by
               FROM expenses WHERE 1=1`;
    const binds: any[] = [];

    if (params.categoryId) {
      sql += ` AND category_id = ?`;
      binds.push(params.categoryId);
    }

    if (params.startDate) {
      sql += ` AND expense_date >= ?`;
      binds.push(params.startDate);
    }

    if (params.endDate) {
      sql += ` AND expense_date <= ?`;
      binds.push(params.endDate);
    }

    sql += ` ORDER BY expense_date DESC, created_at DESC LIMIT ? OFFSET ?`;
    binds.push(params.limit || 50, params.offset || 0);

    const rows = await this.db.prepare(sql).bind(...binds).all<any>();
    return (rows.results || []).map(r => this.mapRow(r));
  }

  async create(expense: Omit<Expense, 'createdAt'>): Promise<Expense> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO expenses (
            id, voucher_number, category_id, expense_date, amount_paise,
            payment_mode, payment_account, payee_name, description, receipt_r2_key,
            tax_deduction_paise, idempotency_key, created_at, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        expense.id,
        expense.voucherNumber,
        expense.categoryId,
        expense.expenseDate,
        expense.amountPaise,
        expense.paymentMode,
        expense.paymentAccount,
        expense.payeeName,
        expense.description,
        expense.receiptR2Key || null,
        expense.taxDeductionPaise,
        null,
        now,
        expense.createdBy
      )
      .run();

    return {
      ...expense,
      createdAt: now,
    };
  }

  private mapRow(row: any): Expense {
    return {
      id: row.id,
      voucherNumber: row.voucher_number,
      categoryId: row.category_id,
      expenseDate: row.expense_date,
      amountPaise: row.amount_paise,
      paymentMode: row.payment_mode as PaymentMode,
      paymentAccount: row.payment_account,
      payeeName: row.payee_name,
      description: row.description,
      receiptR2Key: row.receipt_r2_key || undefined,
      taxDeductionPaise: row.tax_deduction_paise,
      createdAt: row.created_at,
      createdBy: row.created_by,
    };
  }
}
