// ============================================================================
// BusinessHub Enterprise - InventoryService
// Double-entry stock movements, negative inventory protection, WAC valuation
// ============================================================================

import { IInventoryRepository, IInventoryService, InventoryMovementType } from '@/types';

export class InventoryService implements IInventoryService {
  constructor(private invRepo: IInventoryRepository) {}

  async verifyStockAvailability(productId: string, requestedMilliUnits: number): Promise<boolean> {
    const balance = await this.invRepo.getBalance(productId);
    if (!balance) return false;
    return balance.currentStockMilliUnits >= requestedMilliUnits;
  }

  async recordInward(
    productId: string,
    qtyMilli: number,
    unitCostPaise: number,
    refType: string,
    refId: string,
    userId: string
  ): Promise<void> {
    if (qtyMilli <= 0) {
      throw { code: 'INVALID_QUANTITY', message: 'Inward quantity must be strictly positive', statusCode: 400 };
    }

    const currentBalance = await this.invRepo.getBalance(productId);
    const currQty = currentBalance ? currentBalance.currentStockMilliUnits : 0;
    const currWac = currentBalance ? currentBalance.weightedAvgCostPaise : 0;

    // Calculate new Weighted Average Cost (WAC)
    const totalQty = currQty + qtyMilli;
    const currentVal = Math.round((currQty * currWac) / 1000);
    const inwardVal = Math.round((qtyMilli * unitCostPaise) / 1000);
    const newWac = totalQty > 0 ? Math.round(((currentVal + inwardVal) * 1000) / totalQty) : unitCostPaise;

    const newBalanceMilli = currQty + qtyMilli;
    const movementId = 'mov_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    await this.invRepo.recordMovement({
      id: movementId,
      productId,
      movementType: 'PURCHASE_RECEIPT',
      quantityMilliUnits: qtyMilli,
      unitCostPaise,
      balanceAfterMilliUnits: newBalanceMilli,
      referenceType: refType,
      referenceId: refId,
      createdBy: userId,
    });

    await this.invRepo.updateBalance(productId, qtyMilli, newWac);
  }

  async recordOutward(
    productId: string,
    qtyMilli: number,
    refType: string,
    refId: string,
    userId: string
  ): Promise<void> {
    if (qtyMilli <= 0) {
      throw { code: 'INVALID_QUANTITY', message: 'Outward quantity must be strictly positive', statusCode: 400 };
    }

    const currentBalance = await this.invRepo.getBalance(productId);
    const currQty = currentBalance ? currentBalance.currentStockMilliUnits : 0;
    const currWac = currentBalance ? currentBalance.weightedAvgCostPaise : 0;

    if (currQty < qtyMilli) {
      throw {
        code: 'INSUFFICIENT_STOCK',
        message: `Available stock of ${currQty / 1000} is insufficient for requested ${qtyMilli / 1000} units`,
        statusCode: 400,
      };
    }

    const newBalanceMilli = currQty - qtyMilli;
    const movementId = 'mov_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    await this.invRepo.recordMovement({
      id: movementId,
      productId,
      movementType: 'SALE_DISPATCH',
      quantityMilliUnits: -qtyMilli,
      unitCostPaise: currWac,
      balanceAfterMilliUnits: newBalanceMilli,
      referenceType: refType,
      referenceId: refId,
      createdBy: userId,
    });

    await this.invRepo.updateBalance(productId, -qtyMilli);
  }

  async adjustStock(
    productId: string,
    qtyMilli: number,
    type: 'ADD' | 'SUB',
    reason: string,
    userId: string
  ): Promise<void> {
    if (qtyMilli <= 0) {
      throw { code: 'INVALID_QUANTITY', message: 'Adjustment quantity must be strictly positive', statusCode: 400 };
    }

    const currentBalance = await this.invRepo.getBalance(productId);
    const currQty = currentBalance ? currentBalance.currentStockMilliUnits : 0;
    const currWac = currentBalance ? currentBalance.weightedAvgCostPaise : 0;

    const delta = type === 'ADD' ? qtyMilli : -qtyMilli;
    const newBalanceMilli = currQty + delta;

    if (newBalanceMilli < 0) {
      throw { code: 'INSUFFICIENT_STOCK', message: 'Adjustment cannot result in negative stock', statusCode: 400 };
    }

    const movementType: InventoryMovementType = type === 'ADD' ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB';
    const movementId = 'mov_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    await this.invRepo.recordMovement({
      id: movementId,
      productId,
      movementType,
      quantityMilliUnits: delta,
      unitCostPaise: currWac,
      balanceAfterMilliUnits: newBalanceMilli,
      referenceType: 'MANUAL_AUDIT',
      referenceId: 'AUDIT-' + Date.now(),
      notes: reason,
      createdBy: userId,
    });

    await this.invRepo.updateBalance(productId, delta);
  }

  async getStockValuation(): Promise<{ totalValuationPaise: number; skuCount: number }> {
    const balances = await this.invRepo.listAllBalances();
    let totalValuationPaise = 0;

    for (const b of balances) {
      if (b.currentStockMilliUnits > 0) {
        totalValuationPaise += Math.round((b.currentStockMilliUnits * b.weightedAvgCostPaise) / 1000);
      }
    }

    return {
      totalValuationPaise,
      skuCount: balances.length,
    };
  }
}
