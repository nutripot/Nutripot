// ============================================================================
// BusinessHub Enterprise - SupplierRepository
// Cloudflare D1 operations for Suppliers and Supplier Running Balance Ledger
// ============================================================================

import { ISupplierRepository, Supplier, SupplierLedgerEntry } from '@/types';

export class SupplierRepository implements ISupplierRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<Supplier | null> {
    const row = await this.db
      .prepare(
        `SELECT id, name, contact_person, phone, email, gstin, pan,
                billing_address, payment_terms_days, bank_account_name,
                bank_account_number, bank_ifsc, bank_name, current_payable_paise,
                is_active, created_at, updated_at
         FROM suppliers WHERE id = ?`
      )
      .bind(id)
      .first<any>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async list(params: { search?: string; limit?: number; offset?: number }): Promise<Supplier[]> {
    let sql = `SELECT id, name, contact_person, phone, email, gstin, pan,
                      billing_address, payment_terms_days, bank_account_name,
                      bank_account_number, bank_ifsc, bank_name, current_payable_paise,
                      is_active, created_at, updated_at
               FROM suppliers WHERE is_active = 1`;
    const binds: any[] = [];

    if (params.search) {
      sql += ` AND (name LIKE ? OR phone LIKE ? OR gstin LIKE ?)`;
      const term = `%${params.search}%`;
      binds.push(term, term, term);
    }

    sql += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
    binds.push(params.limit || 50, params.offset || 0);

    const rows = await this.db.prepare(sql).bind(...binds).all<any>();
    return (rows.results || []).map(r => this.mapRow(r));
  }

  async create(supplier: Omit<Supplier, 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO suppliers (
            id, name, contact_person, phone, email, gstin, pan,
            billing_address, payment_terms_days, bank_account_name,
            bank_account_number, bank_ifsc, bank_name, current_payable_paise,
            is_active, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        supplier.id,
        supplier.name.trim(),
        supplier.contactPerson || null,
        supplier.phone.trim(),
        supplier.email || null,
        supplier.gstin || null,
        supplier.pan || null,
        supplier.billingAddress.trim(),
        supplier.paymentTermsDays,
        supplier.bankAccountName || null,
        supplier.bankAccountNumber || null,
        supplier.bankIfsc || null,
        supplier.bankName || null,
        supplier.currentPayablePaise,
        supplier.isActive ? 1 : 0,
        now,
        now
      )
      .run();

    return {
      ...supplier,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateBalance(id: string, balanceChangePaise: number): Promise<number> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE suppliers SET current_payable_paise = current_payable_paise + ?, updated_at = ? WHERE id = ?')
      .bind(balanceChangePaise, now, id)
      .run();

    const row = await this.db.prepare('SELECT current_payable_paise FROM suppliers WHERE id = ?').bind(id).first<{ current_payable_paise: number }>();
    return row?.current_payable_paise || 0;
  }

  async appendLedger(entry: Omit<SupplierLedgerEntry, 'createdAt'>): Promise<SupplierLedgerEntry> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO supplier_ledger (
            id, supplier_id, entry_date, entry_type, reference_id, reference_number,
            debit_paise, credit_paise, running_balance_paise, notes, created_at, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.id,
        entry.supplierId,
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

  async getLedger(supplierId: string): Promise<SupplierLedgerEntry[]> {
    const rows = await this.db
      .prepare(
        `SELECT id, supplier_id, entry_date, entry_type, reference_id, reference_number,
                debit_paise, credit_paise, running_balance_paise, notes, created_at, created_by
         FROM supplier_ledger WHERE supplier_id = ?
         ORDER BY entry_date ASC, created_at ASC`
      )
      .bind(supplierId)
      .all<any>();

    return (rows.results || []).map(r => ({
      id: r.id,
      supplierId: r.supplier_id,
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

  private mapRow(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      contactPerson: row.contact_person || undefined,
      phone: row.phone,
      email: row.email || undefined,
      gstin: row.gstin || undefined,
      pan: row.pan || undefined,
      billingAddress: row.billing_address,
      paymentTermsDays: row.payment_terms_days,
      bankAccountName: row.bank_account_name || undefined,
      bankAccountNumber: row.bank_account_number || undefined,
      bankIfsc: row.bank_ifsc || undefined,
      bankName: row.bank_name || undefined,
      currentPayablePaise: row.current_payable_paise,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
