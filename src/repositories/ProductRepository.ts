// ============================================================================
// BusinessHub Enterprise - ProductRepository
// Parameterized Cloudflare D1 operations for Products and Categories
// ============================================================================

import { IProductRepository, Product, UnitOfMeasure, TaxRateBps } from '@/types';

export class ProductRepository implements IProductRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.db
      .prepare(
        `SELECT id, sku, barcode, name, description, category_id, uom, hsn_code,
                tax_rate_bps, cost_price_paise, selling_price_paise, min_stock_alert_level,
                is_active, created_at, updated_at
         FROM products WHERE id = ?`
      )
      .bind(id)
      .first<any>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async findBySku(sku: string): Promise<Product | null> {
    const row = await this.db
      .prepare(
        `SELECT id, sku, barcode, name, description, category_id, uom, hsn_code,
                tax_rate_bps, cost_price_paise, selling_price_paise, min_stock_alert_level,
                is_active, created_at, updated_at
         FROM products WHERE sku = ? COLLATE NOCASE`
      )
      .bind(sku.trim())
      .first<any>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async list(params: {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    let sql = `SELECT id, sku, barcode, name, description, category_id, uom, hsn_code,
                      tax_rate_bps, cost_price_paise, selling_price_paise, min_stock_alert_level,
                      is_active, created_at, updated_at
               FROM products WHERE 1=1`;
    const binds: any[] = [];

    if (params.categoryId) {
      sql += ` AND category_id = ?`;
      binds.push(params.categoryId);
    }

    if (params.isActive !== undefined) {
      sql += ` AND is_active = ?`;
      binds.push(params.isActive ? 1 : 0);
    }

    if (params.search) {
      sql += ` AND (sku LIKE ? OR name LIKE ? OR hsn_code LIKE ?)`;
      const term = `%${params.search}%`;
      binds.push(term, term, term);
    }

    sql += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
    binds.push(params.limit || 50, params.offset || 0);

    const rows = await this.db.prepare(sql).bind(...binds).all<any>();
    return (rows.results || []).map(r => this.mapRow(r));
  }

  async count(params: { search?: string; categoryId?: string; isActive?: boolean }): Promise<number> {
    let sql = `SELECT COUNT(*) as total FROM products WHERE 1=1`;
    const binds: any[] = [];

    if (params.categoryId) {
      sql += ` AND category_id = ?`;
      binds.push(params.categoryId);
    }

    if (params.isActive !== undefined) {
      sql += ` AND is_active = ?`;
      binds.push(params.isActive ? 1 : 0);
    }

    if (params.search) {
      sql += ` AND (sku LIKE ? OR name LIKE ? OR hsn_code LIKE ?)`;
      const term = `%${params.search}%`;
      binds.push(term, term, term);
    }

    const res = await this.db.prepare(sql).bind(...binds).first<{ total: number }>();
    return res?.total || 0;
  }

  async create(product: Omit<Product, 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO products (
            id, sku, barcode, name, description, category_id, uom, hsn_code,
            tax_rate_bps, cost_price_paise, selling_price_paise, min_stock_alert_level,
            is_active, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        product.id,
        product.sku.trim(),
        product.barcode || null,
        product.name.trim(),
        product.description || null,
        product.categoryId,
        product.uom,
        product.hsnCode.trim(),
        product.taxRateBps,
        product.costPricePaise,
        product.sellingPricePaise,
        product.minStockAlertLevel,
        product.isActive ? 1 : 0,
        now,
        now
      )
      .run();

    return {
      ...product,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: string, product: Partial<Product>): Promise<Product> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Product with ID ${id} not found`);
    }

    const updated: Product = {
      ...existing,
      ...product,
      updatedAt: new Date().toISOString(),
    };

    await this.db
      .prepare(
        `UPDATE products SET
            sku = ?, barcode = ?, name = ?, description = ?, category_id = ?,
            uom = ?, hsn_code = ?, tax_rate_bps = ?, cost_price_paise = ?,
            selling_price_paise = ?, min_stock_alert_level = ?, is_active = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        updated.sku,
        updated.barcode || null,
        updated.name,
        updated.description || null,
        updated.categoryId,
        updated.uom,
        updated.hsnCode,
        updated.taxRateBps,
        updated.costPricePaise,
        updated.sellingPricePaise,
        updated.minStockAlertLevel,
        updated.isActive ? 1 : 0,
        updated.updatedAt,
        id
      )
      .run();

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?').bind(now, id).run();
  }

  private mapRow(row: any): Product {
    return {
      id: row.id,
      sku: row.sku,
      barcode: row.barcode || undefined,
      name: row.name,
      description: row.description || undefined,
      categoryId: row.category_id,
      uom: row.uom as UnitOfMeasure,
      hsnCode: row.hsn_code,
      taxRateBps: row.tax_rate_bps as TaxRateBps,
      costPricePaise: row.cost_price_paise,
      sellingPricePaise: row.selling_price_paise,
      minStockAlertLevel: row.min_stock_alert_level,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
