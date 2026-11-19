# Low-Level Design: Expenses Module

**Module Name:** Operational Expenses Management (`expenses`)  
**File Reference:** `docs/architecture/LLD/expenses.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Expenses Module tracks and categorizes operational business overheads (rent, utilities, salaries, marketing, logistics, repairs, software, taxes) distinct from Cost of Goods Sold (COGS), supporting receipt attachments in Cloudflare R2 and tax deduction tracking.

---

## 2. Responsibilities
- Record operational expense vouchers with dates, categories, payment accounts, and payee details.
- Store scanned receipt documents or vendor bills securely in Cloudflare R2 object storage.
- Categorize expenditures to support Profit & Loss operating expense breakdowns.
- Track Tax Deducted at Source (TDS) references where applicable.
- Prevent destructive deletion of historic operational expense vouchers.

---

## 3. Input and Output Contracts

```typescript
export interface RecordExpenseDTO {
  categoryId: string;
  expenseDate: string;             // YYYY-MM-DD
  amountPaise: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CORPORATE_CARD';
  paymentAccount: 'MAIN_BANK' | 'PETTY_CASH';
  payeeName: string;
  description: string;
  receiptR2Key?: string;           // Key of uploaded receipt in Cloudflare R2
  taxDeductionPaise?: number;      // TDS deducted if applicable
  idempotencyKey?: string;
}

export interface ExpenseResponseDTO {
  id: string;
  voucherNumber: string;           // e.g. "EXP-2026-0001"
  categoryId: string;
  categoryName: string;
  expenseDate: string;
  amountPaise: number;
  paymentMode: string;
  paymentAccount: string;
  payeeName: string;
  description: string;
  receiptUrl?: string;             // Pre-signed or protected R2 download URL
  taxDeductionPaise: number;
  createdAt: string;
}
```

---

## 4. Database Tables

```sql
CREATE TABLE expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,                 -- e.g. 'Rent', 'Electricity', 'Logistics', 'Marketing'
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE expenses (
    id TEXT PRIMARY KEY,                       -- UUID v4
    voucher_number TEXT UNIQUE NOT NULL,       -- e.g. 'EXP-2026-0001'
    category_id TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    payment_mode TEXT NOT NULL,                -- 'CASH', 'BANK_TRANSFER', 'UPI', 'CORPORATE_CARD'
    payment_account TEXT NOT NULL DEFAULT 'MAIN_BANK',
    payee_name TEXT NOT NULL,
    description TEXT NOT NULL,
    receipt_r2_key TEXT,
    tax_deduction_paise INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_exp_category ON expenses(category_id);
CREATE INDEX idx_exp_date ON expenses(expense_date);
```

---

## 5. API Endpoints

### 5.1 GET `/api/v1/expenses`
- **Description:** List expenses with date range, category filter, and pagination.
- **Success Response (200 OK):** `ApiResponse<ExpenseResponseDTO[]>`

### 5.2 POST `/api/v1/expenses`
- **Description:** Create a new operational expense voucher.
- **Request Body:** `RecordExpenseDTO`
- **Success Response (201 Created):** `ApiResponse<ExpenseResponseDTO>`

### 5.3 POST `/api/v1/expenses/upload-receipt`
- **Description:** Uploads expense receipt file to Cloudflare R2 bucket.
- **Request:** `multipart/form-data` (file)
- **Success Response (200 OK):** `{"success": true, "data": { "r2Key": "receipts/2026/11/rec_01ha.pdf" }}`

---

## 6. Business Rules
1. **Opex vs. COGS Separation:** Raw material purchases and trade merchandise MUST be processed through the Purchasing Module (`purchase_bills`), NEVER as generic expenses. Only operational overhead is recorded here.
2. **Immutability:** Expense records are immutable once saved; errors are corrected by voiding/reversing vouchers.
3. **Receipt Validation:** Allowed file types for receipts: PDF, JPEG, PNG, WEBP (maximum file size: 10MB).

---

## 7. Validation Rules
- `amountPaise`: Positive integer > 0.
- `categoryId`: Must exist in `expense_categories`.
- `payeeName`: Required, 2 to 255 characters.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INVALID_CATEGORY` | 400 | Expense category does not exist or is inactive |
| `FILE_TOO_LARGE` | 413 | Uploaded receipt exceeds 10MB limit |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Receipt is not PDF, PNG, or JPEG |

---

## 9. Authorization Requirements
- View / Record Expenses: `OWNER` or `ADMIN`.

---

## 10. Dependencies
- `FinancialService`: Queries expenses for P&L Net Income derivation.
- `R2StorageService`: Stores and serves uploaded receipt assets.
- `AuditService`: Logs expense recordings.

---

## 11. Edge Cases
1. **Zero Cash in Petty Cash:** If paying from `PETTY_CASH`, system warns if current petty cash float is negative.
2. **Missing Receipt:** Receipts are optional for petty expenses (< ₹500) but recommended for tax compliance.

---

## 12. Test Cases
1. **TC-EXP-01:** Recording rent expense of ₹45,000 saves `4500000` paise and increments category expense sum.
2. **TC-EXP-02:** Attempting to submit expense with 0 or negative amount fails validation.
3. **TC-EXP-03:** P&L report includes expense amount under the appropriate category breakdown.
