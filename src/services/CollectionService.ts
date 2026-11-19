// ============================================================================
// BusinessHub Enterprise - CollectionService
// Payment receipts, invoice allocations, customer credits, and ledger settlement
// ============================================================================

import {
  ICollectionService,
  ICollectionRepository,
  ISalesRepository,
  ICustomerRepository,
  IAuditRepository,
  Collection,
  CollectionAllocation,
} from '@/types';

export class CollectionService implements ICollectionService {
  constructor(
    private collRepo: ICollectionRepository,
    private salesRepo: ISalesRepository,
    private custRepo: ICustomerRepository,
    private auditRepo: IAuditRepository
  ) {}

  async recordCollection(
    data: Omit<Collection, 'id' | 'receiptNumber' | 'unallocatedPaise' | 'createdAt'>,
    requestedAllocations: Array<{ invoiceId: string; amountPaise: number }> | undefined,
    userId: string
  ): Promise<Collection> {
    if (data.amountPaise <= 0) {
      throw { code: 'INVALID_AMOUNT', message: 'Collection amount must be strictly positive', statusCode: 400 };
    }

    const customer = await this.custRepo.findById(data.customerId);
    if (!customer) {
      throw { code: 'CUSTOMER_NOT_FOUND', message: 'Customer record missing', statusCode: 404 };
    }

    let remainingFunds = data.amountPaise;
    const allocationsToSave: Omit<CollectionAllocation, 'id' | 'createdAt'>[] = [];

    if (requestedAllocations && requestedAllocations.length > 0) {
      // Explicit manual allocations
      for (const req of requestedAllocations) {
        if (remainingFunds <= 0) break;
        const inv = await this.salesRepo.findById(req.invoiceId);
        if (!inv || inv.customerId !== customer.id) {
          throw { code: 'INVALID_INVOICE', message: `Invoice ${req.invoiceId} does not belong to customer`, statusCode: 400 };
        }

        const unpaid = inv.totalAmountPaise - inv.paidAmountPaise;
        const alloc = Math.min(req.amountPaise, unpaid, remainingFunds);

        if (alloc > 0) {
          allocationsToSave.push({
            collectionId: '', // populated during save
            salesInvoiceId: inv.id,
            allocatedPaise: alloc,
          });
          remainingFunds -= alloc;

          const newPaid = inv.paidAmountPaise + alloc;
          const newStatus = newPaid >= inv.totalAmountPaise ? 'PAID' : 'PARTIALLY_PAID';
          await this.salesRepo.updateStatus(inv.id, newStatus, alloc);
        }
      }
    } else {
      // Automated FIFO Allocation against unpaid invoices
      const unpaidInvoices = await this.salesRepo.list({ customerId: customer.id, status: 'ISSUED' });
      for (const inv of unpaidInvoices) {
        if (remainingFunds <= 0) break;
        const unpaid = inv.totalAmountPaise - inv.paidAmountPaise;
        const alloc = Math.min(unpaid, remainingFunds);

        if (alloc > 0) {
          allocationsToSave.push({
            collectionId: '',
            salesInvoiceId: inv.id,
            allocatedPaise: alloc,
          });
          remainingFunds -= alloc;

          const newPaid = inv.paidAmountPaise + alloc;
          const newStatus = newPaid >= inv.totalAmountPaise ? 'PAID' : 'PARTIALLY_PAID';
          await this.salesRepo.updateStatus(inv.id, newStatus, alloc);
        }
      }
    }

    const unallocatedPaise = remainingFunds;
    const collectionId = 'col_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const receiptNumber = 'REC-' + Date.now().toString().slice(-6);

    const saved = await this.collRepo.create(
      {
        ...data,
        id: collectionId,
        receiptNumber,
        unallocatedPaise,
        createdBy: userId,
      },
      allocationsToSave.map(a => ({ ...a, collectionId }))
    );

    // Update customer balance & ledger
    const newReceivable = customer.currentReceivablePaise - data.amountPaise;
    await this.custRepo.updateBalance(customer.id, -data.amountPaise);

    const ledgerId = 'cld_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await this.custRepo.appendLedger({
      id: ledgerId,
      customerId: customer.id,
      entryDate: data.paymentDate,
      entryType: 'COLLECTION_RECEIPT',
      referenceId: collectionId,
      referenceNumber: receiptNumber,
      debitPaise: 0,
      creditPaise: data.amountPaise,
      runningBalancePaise: newReceivable,
      notes: `Payment received: ${receiptNumber} (${data.paymentMode})`,
      createdBy: userId,
    });

    // Log audit entry
    await this.auditRepo.log({
      userId,
      action: 'COLLECTION_RECORDED',
      entityType: 'collections',
      entityId: collectionId,
      newValuesJson: JSON.stringify({ receiptNumber, amountPaise: data.amountPaise, unallocatedPaise }),
    });

    return saved;
  }
}
