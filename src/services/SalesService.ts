// ============================================================================
// BusinessHub Enterprise - SalesService
// Invoicing, tax calculations, stock decrement, customer AR debiting
// ============================================================================

import {
  ISalesService,
  ISalesRepository,
  IInventoryService,
  ICustomerRepository,
  ISettingsRepository,
  IAuditRepository,
  SalesInvoice,
  SalesInvoiceItem,
} from '@/types';
import { calculateGstTax } from '@/utils/currency';

export class SalesService implements ISalesService {
  constructor(
    private salesRepo: ISalesRepository,
    private invService: IInventoryService,
    private custRepo: ICustomerRepository,
    private settingsRepo: ISettingsRepository,
    private auditRepo: IAuditRepository
  ) {}

  async createInvoice(
    data: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'status' | 'createdAt' | 'updatedAt' | 'paidAmountPaise'>,
    items: Omit<SalesInvoiceItem, 'id' | 'salesInvoiceId'>[],
    userId: string
  ): Promise<SalesInvoice> {
    if (items.length === 0) {
      throw { code: 'EMPTY_INVOICE', message: 'Invoice must have at least one line item', statusCode: 400 };
    }

    const settings = await this.settingsRepo.get();
    const isIntraState = data.placeOfSupply === settings.stateCode;

    let subtotalPaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;

    const computedItems: Omit<SalesInvoiceItem, 'id' | 'salesInvoiceId'>[] = [];
    for (const item of items) {
      const itemSubtotal = Math.round((item.quantityMilliUnits * item.unitPricePaise) / 1000) - (item.discountPaise || 0);
      const tax = calculateGstTax(itemSubtotal, item.taxRateBps, isIntraState);

      subtotalPaise += itemSubtotal;
      cgstPaise += tax.cgstPaise;
      sgstPaise += tax.sgstPaise;
      igstPaise += tax.igstPaise;

      computedItems.push({
        ...item,
        cgstPaise: tax.cgstPaise,
        sgstPaise: tax.sgstPaise,
        igstPaise: tax.igstPaise,
        totalAmountPaise: tax.grandTotalPaise,
      });
    }

    const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;
    const shipping = data.shippingChargesPaise || 0;
    const totalAmountPaise = subtotalPaise + totalTaxPaise + shipping;

    const invoiceId = 'inv_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const draftNumber = 'DRAFT-' + Date.now().toString().slice(-6);

    const created = await this.salesRepo.create(
      {
        ...data,
        id: invoiceId,
        invoiceNumber: draftNumber,
        status: 'DRAFT',
        subtotalPaise,
        cgstPaise,
        sgstPaise,
        igstPaise,
        totalTaxPaise,
        shippingChargesPaise: shipping,
        totalAmountPaise,
        paidAmountPaise: 0,
        createdBy: userId,
      },
      computedItems
    );

    return created;
  }

  async confirmInvoice(invoiceId: string, userId: string): Promise<SalesInvoice> {
    const invoice = await this.salesRepo.findById(invoiceId);
    if (!invoice) {
      throw { code: 'NOT_FOUND', message: 'Invoice not found', statusCode: 404 };
    }

    if (invoice.status !== 'DRAFT') {
      throw { code: 'INVALID_STATUS', message: `Cannot confirm invoice with status ${invoice.status}`, statusCode: 400 };
    }

    const items = invoice.items || [];
    // 1. Verify stock availability for all items
    for (const item of items) {
      const available = await this.invService.verifyStockAvailability(item.productId, item.quantityMilliUnits);
      if (!available) {
        throw {
          code: 'INSUFFICIENT_STOCK',
          message: `Stock insufficient for product ${item.productId}`,
          statusCode: 400,
        };
      }
    }

    // 2. Decrement stock for each item
    for (const item of items) {
      await this.invService.recordOutward(
        item.productId,
        item.quantityMilliUnits,
        'SALES_INVOICE',
        invoice.id,
        userId
      );
    }

    // 3. Issue sequential invoice number
    const officialNumber = await this.settingsRepo.getNextInvoiceNumberAndIncrement();

    // 4. Update customer balance and append AR debit to customer ledger
    const customer = await this.custRepo.findById(invoice.customerId);
    if (!customer) {
      throw { code: 'CUSTOMER_NOT_FOUND', message: 'Customer record missing', statusCode: 404 };
    }

    const newReceivable = customer.currentReceivablePaise + invoice.totalAmountPaise;
    await this.custRepo.updateBalance(customer.id, invoice.totalAmountPaise);

    const ledgerId = 'cld_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await this.custRepo.appendLedger({
      id: ledgerId,
      customerId: customer.id,
      entryDate: invoice.invoiceDate,
      entryType: 'SALES_INVOICE',
      referenceId: invoice.id,
      referenceNumber: officialNumber,
      debitPaise: invoice.totalAmountPaise,
      creditPaise: 0,
      runningBalancePaise: newReceivable,
      notes: `Invoice issued: ${officialNumber}`,
      createdBy: userId,
    });

    // 5. Update invoice status to ISSUED
    await this.salesRepo.updateStatus(invoice.id, 'ISSUED');

    // 6. Log audit entry
    await this.auditRepo.log({
      userId,
      action: 'INVOICE_CONFIRMED',
      entityType: 'sales_invoices',
      entityId: invoice.id,
      newValuesJson: JSON.stringify({ invoiceNumber: officialNumber, totalPaise: invoice.totalAmountPaise }),
    });

    const confirmed = await this.salesRepo.findById(invoice.id);
    return confirmed!;
  }
}
