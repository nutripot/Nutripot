// ============================================================================
// BusinessHub Enterprise - CollectionRepository
// Cloudflare D1 operations for Collections and Invoice Allocations
// ============================================================================

import { ICollectionRepository, Collection, CollectionAllocation, PaymentMode } from '@/types';

export class CollectionRepository implements ICollectionRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<Collection | null> {
    const row = await this.db
      .prepare(
        `SELECT id, receipt_number, customer_id, payment_date, payment_mode,
                amount_paise, reference_number, deposit_account, unallocated_paise,
                notes, idempotency_key, created_at, created_by
         FROM collections WHERE id = ?`
      )
      .bind(id)
      .first<any>();

    if (!row) return null;

    const allocRows = await this.db
      .prepare('SELECT id, collection_id, sales_invoice_id, allocated_paise, created_at FROM collection_allocations WHERE collection_id = ?')
      .bind(id)
      .all<any>();

    const allocations: CollectionAllocation[] = (allocRows.results || []).map(a => ({
      id: a.id,
      collectionId: a.collection_id,
      salesInvoiceId: a.sales_invoice_id,
      allocatedPaise: a.allocated_paise,
      createdAt: a.created_at,
    }));

    return {
      id: row.id,
      receiptNumber: row.receipt_number,
      customerId: row.customer_id,
      paymentDate: row.payment_date,
      paymentMode: row.payment_mode as PaymentMode,
      amountPaise: row.amount_paise,
      referenceNumber: row.reference_number || undefined,
      depositAccount: row.deposit_account,
      unallocatedPaise: row.unallocated_paise,
      notes: row.notes || undefined,
      allocations,
      createdAt: row.created_at,
      createdBy: row.created_by,
    };
  }

  async list(params: { customerId?: string; limit?: number; offset?: number }): Promise<Collection[]> {
    let sql = `SELECT id, receipt_number, customer_id, payment_date, payment_mode,
                      amount_paise, reference_number, deposit_account, unallocated_paise,
                      notes, idempotency_key, created_at, created_by
               FROM collections WHERE 1=1`;
    const binds: any[] = [];

    if (params.customerId) {
      sql += ` AND customer_id = ?`;
      binds.push(params.customerId);
    }

    sql += ` ORDER BY payment_date DESC, created_at DESC LIMIT ? OFFSET ?`;
    binds.push(params.limit || 50, params.offset || 0);

    const rows = await this.db.prepare(sql).bind(...binds).all<any>();
    return (rows.results || []).map(r => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      customerId: r.customer_id,
      paymentDate: r.payment_date,
      paymentMode: r.payment_mode as PaymentMode,
      amountPaise: r.amount_paise,
      referenceNumber: r.reference_number || undefined,
      depositAccount: r.deposit_account,
      unallocatedPaise: r.unallocated_paise,
      notes: r.notes || undefined,
      createdAt: r.created_at,
      createdBy: r.created_by,
    }));
  }

  async create(collection: Omit<Collection, 'createdAt'>, allocations: Omit<CollectionAllocation, 'id' | 'createdAt'>[]): Promise<Collection> {
    const now = new Date().toISOString();
    const depositAccount = collection.depositAccount ? collection.depositAccount.trim() : 'BANK';
    const amountPaise = Number(collection.amountPaise ?? 0);
    const unallocatedPaise = Number(collection.unallocatedPaise ?? 0);
    const referenceNumber = collection.referenceNumber ? collection.referenceNumber.trim() : null;
    const notes = collection.notes ? collection.notes.trim() : null;

    const statements: D1PreparedStatement[] = [
      this.db
        .prepare(
          `INSERT INTO collections (
              id, receipt_number, customer_id, payment_date, payment_mode,
              amount_paise, reference_number, deposit_account, unallocated_paise,
              notes, idempotency_key, created_at, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          collection.id,
          collection.receiptNumber,
          collection.customerId,
          collection.paymentDate,
          collection.paymentMode,
          amountPaise,
          referenceNumber,
          depositAccount,
          unallocatedPaise,
          notes,
          null,
          now,
          collection.createdBy
        ),
    ];

    const createdAllocations: CollectionAllocation[] = [];
    for (const alloc of allocations) {
      const allocId = 'cla_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      statements.push(
        this.db
          .prepare(
            `INSERT INTO collection_allocations (id, collection_id, sales_invoice_id, allocated_paise, created_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(allocId, collection.id, alloc.salesInvoiceId, alloc.allocatedPaise, now)
      );
      createdAllocations.push({ ...alloc, id: allocId, createdAt: now });
    }

    await this.db.batch(statements);

    return {
      ...collection,
      allocations: createdAllocations,
      createdAt: now,
    };
  }
}
