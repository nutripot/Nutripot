// ============================================================================
// BusinessHub Enterprise - SalesRepository
// Cloudflare D1 operations for Sales Invoices and Line Items
// ============================================================================

import { ISalesRepository, SalesInvoice, SalesInvoiceItem, SalesInvoiceStatus } from '@/types';

export class SalesRepository implements ISalesRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<SalesInvoice | null> {
    const row = await this.db
      .prepare(
        `SELECT id, invoice_number, customer_id, invoice_date, due_date, place_of_supply,
                status, subtotal_paise, cgst_paise, sgst_paise, igst_paise, total_tax_paise,
                shipping_charges_paise, total_amount_paise, paid_amount_paise, notes,
                idempotency_key, created_at, updated_at, created_by
         FROM sales_invoices WHERE id = ?`
      )
      .bind(id)
      .first<any>();

    if (!row) return null;

    const itemRows = await this.db
      .prepare(
        `SELECT id, sales_invoice_id, product_id, quantity_milli_units, unit_price_paise,
                tax_rate_bps, cgst_paise, sgst_paise, igst_paise, discount_paise, total_amount_paise
         FROM sales_invoice_items WHERE sales_invoice_id = ?`
      )
      .bind(id)
      .all<any>();

    const items: SalesInvoiceItem[] = (itemRows.results || []).map(i => ({
      id: i.id,
      salesInvoiceId: i.sales_invoice_id,
      productId: i.product_id,
      quantityMilliUnits: i.quantity_milli_units,
      unitPricePaise: i.unit_price_paise,
      taxRateBps: i.tax_rate_bps,
      cgstPaise: i.cgst_paise,
      sgstPaise: i.sgst_paise,
      igstPaise: i.igst_paise,
      discountPaise: i.discount_paise,
      totalAmountPaise: i.total_amount_paise,
    }));

    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      customerId: row.customer_id,
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      placeOfSupply: row.place_of_supply,
      status: row.status as SalesInvoiceStatus,
      subtotalPaise: row.subtotal_paise,
      cgstPaise: row.cgst_paise,
      sgstPaise: row.sgst_paise,
      igstPaise: row.igst_paise,
      totalTaxPaise: row.total_tax_paise,
      shippingChargesPaise: row.shipping_charges_paise,
      totalAmountPaise: row.total_amount_paise,
      paidAmountPaise: row.paid_amount_paise,
      notes: row.notes || undefined,
      idempotencyKey: row.idempotency_key || undefined,
      items,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }

  async list(params: { customerId?: string; status?: SalesInvoiceStatus; limit?: number; offset?: number }): Promise<SalesInvoice[]> {
    let sql = `SELECT id, invoice_number, customer_id, invoice_date, due_date, place_of_supply,
                      status, subtotal_paise, cgst_paise, sgst_paise, igst_paise, total_tax_paise,
                      shipping_charges_paise, total_amount_paise, paid_amount_paise, notes,
                      idempotency_key, created_at, updated_at, created_by
               FROM sales_invoices WHERE 1=1`;
    const binds: any[] = [];

    if (params.customerId) {
      sql += ` AND customer_id = ?`;
      binds.push(params.customerId);
    }

    if (params.status) {
      sql += ` AND status = ?`;
      binds.push(params.status);
    }

    sql += ` ORDER BY invoice_date DESC, created_at DESC LIMIT ? OFFSET ?`;
    binds.push(params.limit || 50, params.offset || 0);

    const rows = await this.db.prepare(sql).bind(...binds).all<any>();
    return (rows.results || []).map(r => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      customerId: r.customer_id,
      invoiceDate: r.invoice_date,
      dueDate: r.due_date,
      placeOfSupply: r.place_of_supply,
      status: r.status as SalesInvoiceStatus,
      subtotalPaise: r.subtotal_paise,
      cgstPaise: r.cgst_paise,
      sgstPaise: r.sgst_paise,
      igstPaise: r.igst_paise,
      totalTaxPaise: r.total_tax_paise,
      shippingChargesPaise: r.shipping_charges_paise,
      totalAmountPaise: r.total_amount_paise,
      paidAmountPaise: r.paid_amount_paise,
      notes: r.notes || undefined,
      idempotencyKey: r.idempotency_key || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by,
    }));
  }

  async create(invoice: Omit<SalesInvoice, 'createdAt' | 'updatedAt'>, items: Omit<SalesInvoiceItem, 'id' | 'salesInvoiceId'>[]): Promise<SalesInvoice> {
    const now = new Date().toISOString();

    const statements: D1PreparedStatement[] = [
      this.db
        .prepare(
          `INSERT INTO sales_invoices (
              id, invoice_number, customer_id, invoice_date, due_date, place_of_supply,
              status, subtotal_paise, cgst_paise, sgst_paise, igst_paise, total_tax_paise,
              shipping_charges_paise, total_amount_paise, paid_amount_paise, notes,
              idempotency_key, created_at, updated_at, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          invoice.id,
          invoice.invoiceNumber,
          invoice.customerId,
          invoice.invoiceDate,
          invoice.dueDate,
          invoice.placeOfSupply,
          invoice.status,
          invoice.subtotalPaise,
          invoice.cgstPaise,
          invoice.sgstPaise,
          invoice.igstPaise,
          invoice.totalTaxPaise,
          invoice.shippingChargesPaise,
          invoice.totalAmountPaise,
          invoice.paidAmountPaise,
          invoice.notes || null,
          invoice.idempotencyKey || null,
          now,
          now,
          invoice.createdBy
        ),
    ];

    const createdItems: SalesInvoiceItem[] = [];
    for (const item of items) {
      const itemId = 'sii_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      statements.push(
        this.db
          .prepare(
            `INSERT INTO sales_invoice_items (
                id, sales_invoice_id, product_id, quantity_milli_units, unit_price_paise,
                tax_rate_bps, cgst_paise, sgst_paise, igst_paise, discount_paise, total_amount_paise
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            itemId,
            invoice.id,
            item.productId,
            item.quantityMilliUnits,
            item.unitPricePaise,
            item.taxRateBps,
            item.cgstPaise,
            item.sgstPaise,
            item.igstPaise,
            item.discountPaise,
            item.totalAmountPaise
          )
      );
      createdItems.push({ ...item, id: itemId, salesInvoiceId: invoice.id });
    }

    await this.db.batch(statements);

    return {
      ...invoice,
      items: createdItems,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateStatus(id: string, status: SalesInvoiceStatus, paidPaise?: number): Promise<void> {
    const now = new Date().toISOString();
    if (paidPaise !== undefined) {
      await this.db
        .prepare('UPDATE sales_invoices SET status = ?, paid_amount_paise = paid_amount_paise + ?, updated_at = ? WHERE id = ?')
        .bind(status, paidPaise, now, id)
        .run();
    } else {
      await this.db
        .prepare('UPDATE sales_invoices SET status = ?, updated_at = ? WHERE id = ?')
        .bind(status, now, id)
        .run();
    }
  }
}
