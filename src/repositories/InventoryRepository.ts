// ============================================================================
// BusinessHub Enterprise - InventoryRepository
// Atomic Cloudflare D1 operations for Inventory Movements and Cached Balances
// ============================================================================

import { IInventoryRepository, InventoryBalance, InventoryMovement, InventoryMovementType } from '@/types';

export class InventoryRepository implements IInventoryRepository {
  constructor(private db: D1Database) {}

  async getBalance(productId: string): Promise<InventoryBalance | null> {
    const row = await this.db
      .prepare(
        'SELECT product_id, current_stock_milli_units, weighted_avg_cost_paise, last_updated_at FROM inventory_balances WHERE product_id = ?'
      )
      .bind(productId)
      .first<any>();

    if (!row) return null;
    return {
      productId: row.product_id,
      currentStockMilliUnits: row.current_stock_milli_units,
      weightedAvgCostPaise: row.weighted_avg_cost_paise,
      lastUpdatedAt: row.last_updated_at,
    };
  }

  async recordMovement(movement: Omit<InventoryMovement, 'createdAt'>): Promise<InventoryMovement> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO inventory_movements (
            id, product_id, movement_type, quantity_milli_units, unit_cost_paise,
            balance_after_milli_units, reference_type, reference_id, notes,
            created_at, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        movement.id,
        movement.productId,
        movement.movementType,
        movement.quantityMilliUnits,
        movement.unitCostPaise,
        movement.balanceAfterMilliUnits,
        movement.referenceType,
        movement.referenceId,
        movement.notes || null,
        now,
        movement.createdBy
      )
      .run();

    return {
      ...movement,
      createdAt: now,
    };
  }

  async updateBalance(productId: string, stockChangeMilli: number, newWacPaise?: number): Promise<InventoryBalance> {
    const now = new Date().toISOString();
    const existing = await this.getBalance(productId);

    if (!existing) {
      const initialStock = stockChangeMilli;
      const initialWac = newWacPaise || 0;
      await this.db
        .prepare(
          'INSERT INTO inventory_balances (product_id, current_stock_milli_units, weighted_avg_cost_paise, last_updated_at) VALUES (?, ?, ?, ?)'
        )
        .bind(productId, initialStock, initialWac, now)
        .run();

      return {
        productId,
        currentStockMilliUnits: initialStock,
        weightedAvgCostPaise: initialWac,
        lastUpdatedAt: now,
      };
    }

    const updatedStock = existing.currentStockMilliUnits + stockChangeMilli;
    const updatedWac = newWacPaise !== undefined ? newWacPaise : existing.weightedAvgCostPaise;

    await this.db
      .prepare(
        'UPDATE inventory_balances SET current_stock_milli_units = ?, weighted_avg_cost_paise = ?, last_updated_at = ? WHERE product_id = ?'
      )
      .bind(updatedStock, updatedWac, now, productId)
      .run();

    return {
      productId,
      currentStockMilliUnits: updatedStock,
      weightedAvgCostPaise: updatedWac,
      lastUpdatedAt: now,
    };
  }

  async listMovements(productId: string, limit = 50): Promise<InventoryMovement[]> {
    const rows = await this.db
      .prepare(
        `SELECT id, product_id, movement_type, quantity_milli_units, unit_cost_paise,
                balance_after_milli_units, reference_type, reference_id, notes,
                created_at, created_by
         FROM inventory_movements WHERE product_id = ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .bind(productId, limit)
      .all<any>();

    return (rows.results || []).map(r => ({
      id: r.id,
      productId: r.product_id,
      movementType: r.movement_type as InventoryMovementType,
      quantityMilliUnits: r.quantity_milli_units,
      unitCostPaise: r.unit_cost_paise,
      balanceAfterMilliUnits: r.balance_after_milli_units,
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      notes: r.notes || undefined,
      createdAt: r.created_at,
      createdBy: r.created_by,
    }));
  }

  async listAllBalances(): Promise<Array<InventoryBalance & { sku: string; name: string; uom: string; currentStock: number; reorderLevel: number; weightedAverageCostPaise: number; totalValuationPaise: number }>> {
    const rows = await this.db
      .prepare(
        `SELECT b.product_id, b.current_stock_milli_units, b.weighted_avg_cost_paise, b.last_updated_at,
                p.sku, p.name, p.uom, p.min_stock_alert_level
         FROM products p
         LEFT JOIN inventory_balances b ON b.product_id = p.id
         WHERE p.is_active = 1
         ORDER BY p.name ASC`
      )
      .all<any>();

    return (rows.results || []).map(r => {
      const stock = r.current_stock_milli_units || 0;
      const wac = r.weighted_avg_cost_paise || 0;
      return {
        productId: r.product_id || '',
        currentStockMilliUnits: stock,
        currentStock: stock,
        weightedAvgCostPaise: wac,
        weightedAverageCostPaise: wac,
        totalValuationPaise: Math.round((stock * wac) / 1000),
        lastUpdatedAt: r.last_updated_at || '',
        sku: r.sku,
        name: r.name,
        uom: r.uom,
        reorderLevel: r.min_stock_alert_level || 0,
      };
    });
  }
}
