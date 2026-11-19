# Low-Level Design: Operational Reports & Compliance Module

**Module Name:** Operational & Compliance Reports (`reports`)  
**File Reference:** `docs/architecture/LLD/reports.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Operational Reports Module generates regulatory compliance summaries (Indian GST GSTR-1, GSTR-2/3B), working capital aging analyses (Accounts Receivable and Accounts Payable Aging), inventory stock velocity (Fast/Slow moving), and CSV/JSON data export pipelines.

---

## 2. Responsibilities
- Generate GSTR-1 Outward Supplies report with B2B (registered GSTINs) and B2C breakdowns, HSN summaries, and CGST/SGST/IGST tax splits.
- Generate GSTR-2 Inward Supplies report for verifying supplier Input Tax Credit (ITC) claims.
- Generate Accounts Receivable (AR) Aging summary across customer accounts.
- Generate Accounts Payable (AP) Aging summary across vendor accounts.
- Generate Inventory Velocity & Stock Valuation reports.
- Support streaming CSV export for audit and external accountant handoff.

---

## 3. Input and Output Contracts

```typescript
export interface Gstr1SummaryDTO {
  taxPeriod: string;               // e.g. "2026-11"
  b2bInvoices: Array<{
    customerGstin: string;
    customerName: string;
    invoiceNumber: string;
    invoiceDate: string;
    placeOfSupply: string;
    taxableAmountPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    totalAmountPaise: number;
  }>;
  b2cInvoicesSummary: {
    taxableAmountPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    totalAmountPaise: number;
  };
  hsnSummary: Array<{
    hsnCode: string;
    description: string;
    uom: string;
    totalQuantityUnits: number;
    totalValuePaise: number;
    taxableValuePaise: number;
    integratedTaxPaise: number;
    centralTaxPaise: number;
    stateTaxPaise: number;
  }>;
}

export interface AgingReportDTO {
  asOfDate: string;
  totalOutstandingPaise: number;
  buckets: {
    current0to30Paise: number;
    aging31to60Paise: number;
    aging61to90Paise: number;
    agingOver90Paise: number;
  };
  entities: Array<{
    entityId: string;
    entityName: string;
    phone: string;
    totalBalancePaise: number;
    bucket0to30Paise: number;
    bucket31to60Paise: number;
    bucket61to90Paise: number;
    bucketOver90Paise: number;
  }>;
}
```

---

## 4. Database Tables
Queries across:
- `sales_invoices`, `sales_invoice_items`, `customers`
- `purchase_bills`, `purchase_bill_items`, `suppliers`
- `inventory_balances`, `inventory_movements`, `products`

---

## 5. API Endpoints

### 5.1 GET `/api/v1/reports/gst/gstr-1`
- **Description:** Returns GSTR-1 summary compliant with GST portal filing structures.
- **Query Params:** `month=2026-11` or `startDate=2026-11-01&endDate=2026-11-30`
- **Success Response (200 OK):** `ApiResponse<Gstr1SummaryDTO>`

### 5.2 GET `/api/v1/reports/aging/receivables`
- **Description:** Returns Accounts Receivable aging buckets.
- **Success Response (200 OK):** `ApiResponse<AgingReportDTO>`

### 5.3 GET `/api/v1/reports/aging/payables`
- **Description:** Returns Accounts Payable aging buckets.
- **Success Response (200 OK):** `ApiResponse<AgingReportDTO>`

### 5.4 GET `/api/v1/reports/export/csv`
- **Description:** Streams CSV representation of selected report.
- **Query Params:** `report_type=sales_register&startDate=2026-11-01&endDate=2026-11-19`
- **Response Headers:** `Content-Type: text/csv; Content-Disposition: attachment; filename="sales_register_20261119.csv"`

---

## 6. Business Rules
1. **B2B vs. B2C Categorization:**
   - Any sale to a customer with a non-null, valid GSTIN is classified as B2B.
   - All other sales are aggregated under B2C (Small / Large based on invoice value threshold).
2. **Aging Bucket Rules:** Calculated based on `due_date` compared to `asOfDate`. Overdue days $D = \text{asOfDate} - \text{due\_date}$:
   - $D \le 0$: Current (0-30 days)
   - $1 \le D \le 30$: 0-30 days overdue
   - $31 \le D \le 60$: 31-60 days overdue
   - $61 \le D \le 90$: 61-90 days overdue
   - $D > 90$: 90+ days overdue

---

## 7. Validation Rules
- `month`: Format `YYYY-MM`.
- `asOfDate`: Optional ISO date, defaults to current date.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INVALID_REPORT_TYPE` | 400 | Requested export type unrecognized |
| `UNAUTHORIZED_REPORT_ACCESS` | 403 | Role lacks permission to access compliance reports |

---

## 9. Authorization Requirements
- Access requires `OWNER` or `ADMIN` role.

---

## 10. Dependencies
- Integrates data from `SalesService`, `PurchaseService`, `CustomerService`, `SupplierService`.

---

## 11. Edge Cases
1. **GSTIN Added Later:** If customer GSTIN is updated after invoice issuance, historical invoices retain original B2C classification unless re-issued.
2. **Large Datasets:** CSV streaming is chunked to avoid memory limits in Cloudflare Worker isolates.

---

## 12. Test Cases
1. **TC-REP-01:** GSTR-1 separates registered customer invoices into B2B and unregistered into B2C.
2. **TC-REP-02:** HSN summary sums quantities and taxable values accurately across all invoice items.
3. **TC-REP-03:** CSV export endpoint outputs valid RFC 4180 CSV with proper decimal currency formatting.
