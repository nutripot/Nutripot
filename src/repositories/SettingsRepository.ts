// ============================================================================
// BusinessHub Enterprise - SettingsRepository
// Cloudflare D1 operations for Singleton Business Profile & Settings
// ============================================================================

import { ISettingsRepository, Settings } from '@/types';

export class SettingsRepository implements ISettingsRepository {
  constructor(private db: D1Database) {}

  async get(): Promise<Settings> {
    const row = await this.db
      .prepare('SELECT * FROM settings WHERE id = ?')
      .bind('SYSTEM_CONFIG')
      .first<any>();

    if (!row) {
      throw new Error('System settings singleton not found. Has seed data been applied?');
    }

    return {
      id: row.id,
      companyName: row.company_name,
      tradeName: row.trade_name || undefined,
      gstin: row.gstin,
      pan: row.pan,
      stateCode: row.state_code,
      stateName: row.state_name,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2 || undefined,
      city: row.city,
      pincode: row.pincode,
      phone: row.phone,
      email: row.email,
      website: row.website || undefined,
      logoR2Key: row.logo_r2_key || undefined,
      bankName: row.bank_name,
      bankAccountName: row.bank_account_name,
      bankAccountNumber: row.bank_account_number,
      bankIfsc: row.bank_ifsc,
      bankBranch: row.bank_branch || undefined,
      bankUpiId: row.bank_upi_id || undefined,
      invoicePrefix: row.invoice_prefix,
      nextInvoiceNumber: row.next_invoice_number,
      receiptPrefix: row.receipt_prefix,
      termsConditions: row.terms_conditions || undefined,
      allowNegativeStock: Boolean(row.allow_negative_stock),
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  }

  async update(settings: Partial<Settings>): Promise<Settings> {
    const current = await this.get();
    const updated: Settings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    await this.db
      .prepare(
        `UPDATE settings SET
            company_name = ?, trade_name = ?, gstin = ?, pan = ?, state_code = ?, state_name = ?,
            address_line1 = ?, address_line2 = ?, city = ?, pincode = ?, phone = ?, email = ?,
            website = ?, logo_r2_key = ?, bank_name = ?, bank_account_name = ?, bank_account_number = ?,
            bank_ifsc = ?, bank_branch = ?, bank_upi_id = ?, invoice_prefix = ?,
            receipt_prefix = ?, terms_conditions = ?, allow_negative_stock = ?,
            updated_at = ?, updated_by = ?
         WHERE id = 'SYSTEM_CONFIG'`
      )
      .bind(
        updated.companyName,
        updated.tradeName || null,
        updated.gstin,
        updated.pan,
        updated.stateCode,
        updated.stateName,
        updated.addressLine1,
        updated.addressLine2 || null,
        updated.city,
        updated.pincode,
        updated.phone,
        updated.email,
        updated.website || null,
        updated.logoR2Key || null,
        updated.bankName,
        updated.bankAccountName,
        updated.bankAccountNumber,
        updated.bankIfsc,
        updated.bankBranch || null,
        updated.bankUpiId || null,
        updated.invoicePrefix,
        updated.receiptPrefix,
        updated.termsConditions || null,
        updated.allowNegativeStock ? 1 : 0,
        updated.updatedAt,
        updated.updatedBy
      )
      .run();

    return updated;
  }

  async getNextInvoiceNumberAndIncrement(): Promise<string> {
    const current = await this.get();
    const formatted = `${current.invoicePrefix}${current.nextInvoiceNumber.toString().padStart(4, '0')}`;
    await this.db
      .prepare("UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 'SYSTEM_CONFIG'")
      .run();
    return formatted;
  }
}
