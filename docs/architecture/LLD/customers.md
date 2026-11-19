# Low-Level Design: Customer Management Module

**Module Name:** Customer & Receivables Management (`customers`)  
**File Reference:** `docs/architecture/LLD/customers.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Customer Management Module maintains customer master profiles, credit terms, and addresses, tracks Accounts Receivable (AR), maintains an immutable customer running balance ledger, and performs receivables aging analysis.

---

## 2. Responsibilities
- Manage customer accounts (B2B commercial clients with GSTIN and B2C individual customers).
- Enforce customer credit limits and credit periods.
- Maintain an immutable, double-entry customer running balance ledger (`customer_ledger`).
- Calculate Accounts Receivable aging buckets: 0-30 days, 31-60 days, 61-90 days, 90+ days.
- Support customer account statement exports.

---

## 3. Input and Output Contracts

```typescript
export interface CreateCustomerDTO {
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  gstin?: string;
  pan?: string;
  billingAddress: string;
  shippingAddress?: string;
  creditLimitPaise: number;        // e.g. 50000000 = ₹5,00,000 credit limit
  creditDays: number;              // e.g. 30 days
}

export interface CustomerLedgerEntryDTO {
  id: string;
  entryDate: string;
  entryType: 'SALES_INVOICE' | 'COLLECTION_RECEIPT' | 'CREDIT_NOTE' | 'OPENING_BALANCE';
  referenceId: string;
  referenceNumber: string;
  debitPaise: number;              // Invoices issued (increases receivable)
  creditPaise: number;             // Payments received / Credit Notes (reduces receivable)
  runningBalancePaise: number;     // Net customer debt
  notes?: string;
}

export interface CustomerAgingDTO {
  customerId: string;
  customerName: string;
  totalOutstandingPaise: number;
  current0to30Paise: number;
  aging31to60Paise: number;
  aging61to90Paise: number;
  agingOver90Paise: number;
}
```

---

## 4. Database Tables

```sql
CREATE TABLE customers (
    id TEXT PRIMARY KEY,                       -- UUID v4
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    billing_address TEXT NOT NULL,
    shipping_address TEXT,
    credit_limit_paise INTEGER NOT NULL DEFAULT 0,
    credit_days INTEGER NOT NULL DEFAULT 30,
    current_receivable_paise INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE customer_ledger (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    entry_type TEXT NOT NULL,                  -- 'SALES_INVOICE', 'COLLECTION_RECEIPT', 'CREDIT_NOTE', 'OPENING_BALANCE'
    reference_id TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    debit_paise INTEGER NOT NULL DEFAULT 0,    -- Invoiced amount
    credit_paise INTEGER NOT NULL DEFAULT 0,   -- Payment received / credit note
    running_balance_paise INTEGER NOT NULL,    -- Net receivable
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_cust_ledger_cust ON customer_ledger(customer_id);
CREATE INDEX idx_cust_ledger_date ON customer_ledger(entry_date);
```

---

## 5. API Endpoints

### 5.1 GET `/api/v1/customers`
- **Description:** List customers with search, outstanding balance, and credit usage.
- **Success Response (200 OK):** `ApiResponse<CustomerResponseDTO[]>`

### 5.2 POST `/api/v1/customers`
- **Description:** Create a new customer profile.
- **Request Body:** `CreateCustomerDTO`
- **Success Response (201 Created):** `ApiResponse<CustomerResponseDTO>`

### 5.3 GET `/api/v1/customers/:id/ledger`
- **Description:** Retrieve customer running ledger statement.
- **Success Response (200 OK):** `ApiResponse<CustomerLedgerEntryDTO[]>`

### 5.4 GET `/api/v1/customers/:id/aging`
- **Description:** Retrieve accounts receivable aging report for customer.
- **Success Response (200 OK):** `ApiResponse<CustomerAgingDTO>`

---

## 6. Business Rules
1. **Ledger Immutability:** Customer ledger rows are append-only.
2. **Double-Entry Balance Invariant:**
   $$\text{running\_balance}_{n} = \text{running\_balance}_{n-1} + \text{debit\_paise}_n - \text{credit\_paise}_n$$
   A positive balance indicates customer owes money to the business.
3. **Credit Limit Check:** If `credit_limit_paise > 0`, issuing a new invoice that causes `current_receivable_paise + invoice_total > credit_limit_paise` requires an explicit owner override flag.

---

## 7. Validation Rules
- `name`: Required, 2 to 255 characters.
- `phone`: Required string.
- `creditLimitPaise`: Non-negative integer.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `CREDIT_LIMIT_EXCEEDED` | 400 | New invoice exceeds authorized credit limit |
| `CUSTOMER_NOT_FOUND` | 404 | Customer ID does not exist |

---

## 9. Authorization Requirements
- Read endpoints: `OWNER`, `ADMIN`, `STAFF`.
- Create / Edit: `OWNER`, `ADMIN`.

---

## 10. Dependencies
- `ISalesService`: Appends invoice debits and credit note credits.
- `ICollectionService`: Appends payment receipt credits.

---

## 11. Edge Cases
1. **Customer Advance:** When customer pays ahead of an invoice, running balance becomes negative (credit balance owed to customer).
2. **Credit Limit Zero:** A credit limit of 0 implies strict cash-and-carry (immediate payment required).

---

## 12. Test Cases
1. **TC-CUST-01:** Customer ledger correctly computes running balance across invoices, receipts, and returns.
2. **TC-CUST-03:** Aging query accurately distributes unpaid invoice balances into 0-30, 31-60, 61-90, 90+ buckets.
