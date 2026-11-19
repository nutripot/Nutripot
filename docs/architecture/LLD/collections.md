# Low-Level Design: Collections Module

**Module Name:** Collections & Receipts Management (`collections`)  
**File Reference:** `docs/architecture/LLD/collections.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Collections Module manages customer payments received via Cash, Bank Transfer (NEFT/RTGS/IMPS), UPI, Card, or Cheque. It handles invoice allocation, partial settlements, advance credit tracking, and receipt voucher generation.

---

## 2. Responsibilities
- Record payments received from customers in exact integer paise.
- Allocate incoming payments against specific outstanding sales invoices (partial or full settlement).
- Support automated FIFO invoice allocation or explicit manual invoice distribution.
- Maintain unallocated credit balances when payment exceeds specified invoice totals.
- Update sales invoice payment statuses (`ISSUED` -> `PARTIALLY_PAID` -> `PAID`).
- Append credit entries to `customer_ledger` and generate printable receipt vouchers.

---

## 3. Input and Output Contracts

```typescript
export interface InvoiceAllocationInputDTO {
  invoiceId: string;
  allocatedPaise: number;
}

export interface RecordCollectionDTO {
  customerId: string;
  paymentDate: string;             // YYYY-MM-DD
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CARD';
  amountPaise: number;
  referenceNumber?: string;        // e.g. UTR number, Cheque number, Transaction ID
  depositAccount: 'MAIN_BANK' | 'PETTY_CASH' | 'UPI_ACCOUNT';
  allocations?: InvoiceAllocationInputDTO[]; // Optional; if omitted, allocates via FIFO
  notes?: string;
  idempotencyKey?: string;
}

export interface CollectionResponseDTO {
  id: string;
  receiptNumber: string;           // e.g. "REC-2026-0001"
  customerId: string;
  customerName: string;
  paymentDate: string;
  paymentMode: string;
  amountPaise: number;
  referenceNumber: string | null;
  unallocatedPaise: number;
  allocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    allocatedPaise: number;
    invoiceRemainingBalancePaise: number;
  }>;
  createdAt: string;
}
```

---

## 4. Database Tables

```sql
CREATE TABLE collections (
    id TEXT PRIMARY KEY,                       -- UUID v4
    receipt_number TEXT UNIQUE NOT NULL,       -- e.g. 'REC-2026-0001'
    customer_id TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    payment_mode TEXT NOT NULL,                -- 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD'
    amount_paise INTEGER NOT NULL,
    reference_number TEXT,
    deposit_account TEXT NOT NULL DEFAULT 'MAIN_BANK',
    unallocated_paise INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE collection_allocations (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    sales_invoice_id TEXT NOT NULL,
    allocated_paise INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE RESTRICT
);

CREATE INDEX idx_coll_customer ON collections(customer_id);
CREATE INDEX idx_coll_date ON collections(payment_date);
CREATE INDEX idx_alloc_invoice ON collection_allocations(sales_invoice_id);
```

---

## 5. API Endpoints

### 5.1 POST `/api/v1/collections`
- **Description:** Records a collection and allocates it to invoices atomically.
- **Request Body:** `RecordCollectionDTO`
- **Success Response (201 Created):** `ApiResponse<CollectionResponseDTO>`

### 5.2 GET `/api/v1/collections`
- **Description:** List collections with customer filtering, date ranges, and pagination.
- **Success Response (200 OK):** `ApiResponse<CollectionResponseDTO[]>`

### 5.3 GET `/api/v1/collections/:id`
- **Description:** Fetch receipt voucher details and allocated invoices.
- **Success Response (200 OK):** `ApiResponse<CollectionResponseDTO>`

---

## 6. Business Rules
1. **Allocation Sum Invariant:**
   $$\sum \text{allocated\_paise} + \text{unallocated\_paise} == \text{amount\_paise}$$
   Allocations can never exceed total collected funds.
2. **Invoice Overpayment Protection:** An allocation to an invoice cannot exceed that invoice's outstanding balance:
   $$\text{allocated\_paise} \le \text{total\_amount\_paise} - \text{paid\_amount\_paise}$$
3. **Automated FIFO Allocation:** If `allocations` array is omitted, system sorts customer's unpaid invoices by `due_date ASC` and settles them sequentially until collection amount is exhausted.
4. **Customer Ledger Credit:** The entire collection `amount_paise` is credited immediately to `customer_ledger`.

---

## 7. Validation Rules
- `customerId`: Required, active customer.
- `amountPaise`: Positive integer > 0.
- `paymentMode`: One of `CASH`, `BANK_TRANSFER`, `UPI`, `CHEQUE`, `CARD`.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `ALLOCATION_EXCEEDS_INVOICE_BALANCE` | 400 | Allocation amount is greater than invoice unpaid balance |
| `ALLOCATION_SUM_MISMATCH` | 400 | Sum of allocations exceeds total collection amount |
| `CUSTOMER_MISMATCH` | 400 | Invoice does not belong to specified customer |

---

## 9. Authorization Requirements
- Record collection: `OWNER`, `ADMIN`, `STAFF`.
- View collections: `OWNER`, `ADMIN`, `STAFF`.

---

## 10. Dependencies
- `CustomerService`: Updates customer receivable balance and appends ledger entry.
- `SalesService`: Updates invoice `paid_amount_paise` and payment status.
- `AuditService`: Logs collection receipt creation.

---

## 11. Edge Cases
1. **Unallocated Advance:** When payment has no active invoices, `unallocated_paise` equals `amount_paise`. Later invoices can be settled against this credit via reallocation.
2. **Cheque Bouncing:** Handled by creating a reverse debit adjustment voucher in customer ledger.

---

## 12. Test Cases
1. **TC-COLL-01:** Full payment of ₹10,000 updates invoice status to `PAID` and reduces customer balance by ₹10,000.
2. **TC-COLL-02:** Partial payment of ₹4,000 on ₹10,000 invoice sets status to `PARTIALLY_PAID` with ₹6,000 outstanding.
3. **TC-COLL-03:** Excess payment of ₹15,000 on ₹10,000 invoice marks invoice `PAID` and records ₹5,000 unallocated customer advance.
