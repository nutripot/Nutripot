// ============================================================================
// BusinessHub Enterprise - CustomerRepository
// Cloudflare D1 operations for Customers and Customer Running Balance Ledger
// ============================================================================

import { ICustomerRepository, Customer, CustomerLedgerEntry } from '@/types';

export class CustomerRepository implements ICustomerRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<Customer | null> {
    const row = await this.db
      .prepare(
        `SELECT id, name, company_name, phone, email, gstin, pan,
                billing_address, shipping_address, credit_limit_paise, credit_days,
                current_receivable_paise, is_active, created_at, updated_at
         FROM customers WHERE id = ?`
      )
      .bind(id)
      .first<any>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async list(params: { search?: string; limit?: number; offset?: number }): Promise<Customer[]> {
    let sql = `SELECT id, name, company_name, phone, email, gstin, pan,
                      billing_address, shipping_address, credit_limit_paise, credit_days,
                      current_receivable_paise, is_active, created_at, updated_at
               FROM customers WHERE is_active = 1`;
    const binds: any[] = [];

    if (params.search) {
      sql += ` AND (name LIKE ? OR company_name LIKE ? OR phone LIKE ? OR gstin LIKE ?)`;
      const term = `%${params.search}%`;
      binds.push(term, term, term, term);
    }

    sql += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
    binds.push(params.limit || 50, params.offset || 0);

    const rows = await this.db.prepare(sql).bind(...binds).all<any>();
    return (rows.results || []).map(r => this.mapRow(r));
  }

  async create(customer: Omit<Customer, 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO customers (
            id, name, company_name, phone, email, gstin, pan,
            billing_address, shipping_address, credit_limit_paise, credit_days,
            current_receivable_paise, is_active, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        customer.id,
        customer.name.trim(),
        customer.companyName || null,
        customer.phone.trim(),
        customer.email || null,
        customer.gstin || null,
        customer.pan || null,
        customer.billingAddress.trim(),
        customer.shippingAddress || null,
        customer.creditLimitPaise,
        customer.creditDays,
        customer.currentReceivablePaise,
        customer.isActive ? 1 : 0,
        now,
        now
      )
      .run();

    return {
      ...customer,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateBalance(id: string, balanceChangePaise: number): Promise<number> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE customers SET current_receivable_paise = current_receivable_paise + ?, updated_at = ? WHERE id = ?')
      .bind(balanceChangePaise, now, id)
      .run();

    const row = await this.db.prepare('SELECT current_receivable_paise FROM customers WHERE id = ?').bind(id).first<{ current_receivable_paise: number }>();
    return row?.current_receivable_paise || 0;
  }

  async appendLedger(entry: Omit<CustomerLedgerEntry, 'createdAt'>): Promise<CustomerLedgerEntry> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO customer_ledger (
            id, customer_id, entry_date, entry_type, reference_id, reference_number,
            debit_paise, credit_paise, running_balance_paise, notes, created_at, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.id,
        entry.customerId,
        entry.entryDate,
        entry.entryType,
        entry.referenceId,
        entry.referenceNumber,
        entry.debitPaise,
        entry.creditPaise,
        entry.runningBalancePaise,
        entry.notes || null,
        now,
        entry.createdBy
      )
      .run();

    return {
      ...entry,
      createdAt: now,
    };
  }

  async getLedger(customerId: string): Promise<CustomerLedgerEntry[]> {
    const rows = await this.db
      .prepare(
        `SELECT id, customer_id, entry_date, entry_type, reference_id, reference_number,
                debit_paise, credit_paise, running_balance_paise, notes, created_at, created_by
         FROM customer_ledger WHERE customer_id = ?
         ORDER BY entry_date ASC, created_at ASC`
      )
      .bind(customerId)
      .all<any>();

    return (rows.results || []).map(r => ({
      id: r.id,
      customerId: r.customer_id,
      entryDate: r.entry_date,
      entryType: r.entry_type,
      referenceId: r.reference_id,
      referenceNumber: r.reference_number,
      debitPaise: r.debit_paise,
      creditPaise: r.credit_paise,
      runningBalancePaise: r.running_balance_paise,
      notes: r.notes || undefined,
      createdAt: r.created_at,
      createdBy: r.created_by,
    }));
  }

  private mapRow(row: any): Customer {
    return {
      id: row.id,
      name: row.name,
      companyName: row.company_name || undefined,
      phone: row.phone,
      email: row.email || undefined,
      gstin: row.gstin || undefined,
      pan: row.pan || undefined,
      billingAddress: row.billing_address,
      shippingAddress: row.shipping_address || undefined,
      creditLimitPaise: row.credit_limit_paise,
      creditDays: row.credit_days,
      currentReceivablePaise: row.current_receivable_paise,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
