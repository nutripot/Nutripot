// ============================================================================
// BusinessHub Enterprise - PurchaseService
// Procurement, vendor bills, stock inward with WAC, and AP crediting
// ============================================================================

import {
  IPurchaseService,
  IPurchaseRepository,
  IInventoryService,
  ISupplierRepository,
  IAuditRepository,
  PurchaseBill,
  PurchaseBillItem,
} from '@/types';

export class PurchaseService implements IPurchaseService {
  constructor(
    private purchRepo: IPurchaseRepository,
    private invService: IInventoryService,
    private suppRepo: ISupplierRepository,
    private auditRepo: IAuditRepository
  ) {}

  async createBill(
    data: Omit<PurchaseBill, 'id' | 'billNumber' | 'status' | 'createdAt' | 'updatedAt' | 'paidAmountPaise'>,
    items: Omit<PurchaseBillItem, 'id' | 'purchaseBillId'>[],
    userId: string
  ): Promise<PurchaseBill> {
    if (items.length === 0) {
      throw { code: 'EMPTY_BILL', message: 'Purchase bill must have at least one line item', statusCode: 400 };
    }

    let subtotalPaise = 0;
    let taxAmountPaise = 0;

    const computedItems: Omit<PurchaseBillItem, 'id' | 'purchaseBillId'>[] = [];
    for (const item of items) {
      const itemSubtotal = Math.round((item.quantityMilliUnits * item.unitPricePaise) / 1000) - (item.discountPaise || 0);
      const itemTax = Math.round((itemSubtotal * item.taxRateBps) / 10000);

      subtotalPaise += itemSubtotal;
      taxAmountPaise += itemTax;

      computedItems.push({
        ...item,
        taxAmountPaise: itemTax,
        totalAmountPaise: itemSubtotal + itemTax,
      });
    }

    const shipping = data.shippingChargesPaise || 0;
    const totalAmountPaise = subtotalPaise + taxAmountPaise + shipping;

    const billId = 'pb_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const billNumber = 'PB-' + Date.now().toString().slice(-6);

    const created = await this.purchRepo.create(
      {
        ...data,
        id: billId,
        billNumber,
        status: 'DRAFT',
        subtotalPaise,
        taxAmountPaise,
        shippingChargesPaise: shipping,
        totalAmountPaise,
        paidAmountPaise: 0,
        createdBy: userId,
      },
      computedItems
    );

    return created;
  }

  async confirmBill(billId: string, userId: string): Promise<PurchaseBill> {
    const bill = await this.purchRepo.findById(billId);
    if (!bill) {
      throw { code: 'NOT_FOUND', message: 'Purchase bill not found', statusCode: 404 };
    }

    if (bill.status !== 'DRAFT') {
      throw { code: 'INVALID_STATUS', message: `Cannot confirm bill with status ${bill.status}`, statusCode: 400 };
    }

    const items = bill.items || [];
    // 1. Inward all items into stock with WAC update
    for (const item of items) {
      await this.invService.recordInward(
        item.productId,
        item.quantityMilliUnits,
        item.unitPricePaise,
        'PURCHASE_BILL',
        bill.id,
        userId
      );
    }

    // 2. Update supplier balance and append AP credit to supplier ledger
    const supplier = await this.suppRepo.findById(bill.supplierId);
    if (!supplier) {
      throw { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier record missing', statusCode: 404 };
    }

    const newPayable = supplier.currentPayablePaise + bill.totalAmountPaise;
    await this.suppRepo.updateBalance(supplier.id, bill.totalAmountPaise);

    const ledgerId = 'sld_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await this.suppRepo.appendLedger({
      id: ledgerId,
      supplierId: supplier.id,
      entryDate: bill.billDate,
      entryType: 'PURCHASE_BILL',
      referenceId: bill.id,
      referenceNumber: bill.billNumber,
      debitPaise: 0,
      creditPaise: bill.totalAmountPaise,
      runningBalancePaise: newPayable,
      notes: `Bill confirmed: ${bill.billNumber} (Vendor Ref: ${bill.supplierBillNumber})`,
      createdBy: userId,
    });

    // 3. Update bill status to CONFIRMED
    await this.purchRepo.updateStatus(bill.id, 'CONFIRMED');

    // 4. Log audit entry
    await this.auditRepo.log({
      userId,
      action: 'PURCHASE_CONFIRMED',
      entityType: 'purchase_bills',
      entityId: bill.id,
      newValuesJson: JSON.stringify({ billNumber: bill.billNumber, totalPaise: bill.totalAmountPaise }),
    });

    const confirmed = await this.purchRepo.findById(bill.id);
    return confirmed!;
  }
}
