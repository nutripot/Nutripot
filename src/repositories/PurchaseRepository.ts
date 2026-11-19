// ============================================================================
// BusinessHub Enterprise - PurchaseRepository
// Cloudflare D1 operations for Purchase Bills and Line Items
// ============================================================================

import { IPurchaseRepository, PurchaseBill, PurchaseBillItem, PurchaseBillStatus } from '@/types';

export class PurchaseRepository implements IPurchaseRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<PurchaseBill | null> {
    const row = await this.db
      .prepare(
        `SELECT id, bill_number, supplier_id, supplier_bill_number, bill_date, due_date,
                status, subtotal_paise, tax_amount_paise, shipping_charges_paise,
                total_amount_paise, paid_amount_paise, notes, idempotency_key,
                created_at, updated_at, created_by
         FROM purchase_bills WHERE id = ?`
      )
      .bind(id)
      .first<any>();

    if (!row) return null;

    const itemRows = await this.db
      .prepare(
        `SELECT id, purchase_bill_id, product_id, quantity_milli_units, unit_price_paise,
                tax_rate_bps, tax_amount_paise, discount_paise, total_amount_paise
         FROM purchase_bill_items WHERE purchase_bill_id = ?`
      )
      .bind(id)
      .all<any>();

    const items: PurchaseBillItem[] = (itemRows.results || []).map(i => ({
      id: i.id,
      purchaseBillId: i.purchase_bill_id,
      productId: i.product_id,
      quantityMilliUnits: i.quantity_milli_units,
      unitPricePaise: i.unit_price_paise,
      taxRateBps: i.tax_rate_bps,
      taxAmountPaise: i.tax_amount_paise,
      discountPaise: i.discount_paise,
      totalAmountPaise: i.total_amount_paise,
    }));

    return {
      id: row.id,
      billNumber: row.bill_number,
      supplierId: row.supplier_id,
      supplierBillNumber: row.supplier_bill_number,
      billDate: row.bill_date,
      dueDate: row.due_date,
      status: row.status as PurchaseBillStatus,
      subtotalPaise: row.subtotal_paise,
      taxAmountPaise: row.tax_amount_paise,
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

  async list(params: { supplierId?: string; status?: PurchaseBillStatus; limit?: number; offset?: number }): Promise<PurchaseBill[]> {
    let sql = `SELECT id, bill_number, supplier_id, supplier_bill_number, bill_date, due_date,
                      status, subtotal_paise, tax_amount_paise, shipping_charges_paise,
                      total_amount_paise, paid_amount_paise, notes, idempotency_key,
                      created_at, updated_at, created_by
               FROM purchase_bills WHERE 1=1`;
    const binds: any[] = [];

    if (params.supplierId) {
      sql += ` AND supplier_id = ?`;
      binds.push(params.supplierId);
    }

    if (params.status) {
      sql += ` AND status = ?`;
      binds.push(params.status);
    }

    sql += ` ORDER BY bill_date DESC, created_at DESC LIMIT ? OFFSET ?`;
    binds.push(params.limit || 50, params.offset || 0);

    const rows = await this.db.prepare(sql).bind(...binds).all<any>();
    return (rows.results || []).map(r => ({
      id: r.id,
      billNumber: r.bill_number,
      supplierId: r.supplier_id,
      supplierBillNumber: r.supplier_bill_number,
      billDate: r.bill_date,
      dueDate: r.due_date,
      status: r.status as PurchaseBillStatus,
      subtotalPaise: r.subtotal_paise,
      taxAmountPaise: r.tax_amount_paise,
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

  async create(bill: Omit<PurchaseBill, 'createdAt' | 'updatedAt'>, items: Omit<PurchaseBillItem, 'id'>[]): Promise<PurchaseBill> {
    const now = new Date().toISOString();

    const statements: D1PreparedStatement[] = [
      this.db
        .prepare(
          `INSERT INTO purchase_bills (
              id, bill_number, supplier_id, supplier_bill_number, bill_date, due_date,
              status, subtotal_paise, tax_amount_paise, shipping_charges_paise,
              total_amount_paise, paid_amount_paise, notes, idempotency_key,
              created_at, updated_at, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          bill.id,
          bill.billNumber,
          bill.supplierId,
          bill.supplierBillNumber,
          bill.billDate,
          bill.dueDate,
          bill.status,
          bill.subtotalPaise,
          bill.taxAmountPaise,
          bill.shippingChargesPaise,
          bill.totalAmountPaise,
          bill.paidAmountPaise,
          bill.notes || null,
          bill.idempotencyKey || null,
          now,
          now,
          bill.createdBy
        ),
    ];

    const createdItems: PurchaseBillItem[] = [];
    for (const item of items) {
      const itemId = 'pbi_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      statements.push(
        this.db
          .prepare(
            `INSERT INTO purchase_bill_items (
                id, purchase_bill_id, product_id, quantity_milli_units, unit_price_paise,
                tax_rate_bps, tax_amount_paise, discount_paise, total_amount_paise
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            itemId,
            bill.id,
            item.productId,
            item.quantityMilliUnits,
            item.unitPricePaise,
            item.taxRateBps,
            item.taxAmountPaise,
            item.discountPaise,
            item.totalAmountPaise
          )
      );
      createdItems.push({ ...item, id: itemId });
    }

    await this.db.batch(statements);

    return {
      ...bill,
      items: createdItems,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateStatus(id: string, status: PurchaseBillStatus): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare('UPDATE purchase_bills SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, id).run();
  }
}
