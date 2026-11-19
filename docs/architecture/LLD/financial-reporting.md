# Low-Level Design: Financial Reporting Module

**Module Name:** Financial Intelligence & Reporting (`financial-reporting`)  
**File Reference:** `docs/architecture/LLD/financial-reporting.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Financial Reporting Module computes deterministic, real-time accounting and commercial financial reports: Profit & Loss (Income Statement), Cost of Goods Sold (COGS), Balance Sheet summary, Cash Flow statement, and Product Margins, operating on exact integer paise.

---

## 2. Responsibilities
- Real-time Profit & Loss derivation without slow multi-stage batch processing.
- Computation of Cost of Goods Sold (COGS) derived from actual outward inventory movements.
- Gross Margin, Operating Margin, and Net Profit Margin analysis.
- Balance Sheet asset and liability reconciliation (Accounts Receivable + Stock Value vs. Accounts Payable).
- Cash Flow statement (Operating Cash Inflow vs. Supplier Outflow and Operating Expenses).
- Product Profitability Ranking (Marginal profit per SKU).

---

## 3. Input and Output Contracts

```typescript
export interface FinancialPeriodQueryDTO {
  startDate: string;               // YYYY-MM-DD
  endDate: string;                 // YYYY-MM-DD
}

export interface ProfitLossReportDTO {
  period: { startDate: string; endDate: string };
  revenue: {
    grossSalesPaise: number;
    salesReturnsPaise: number;
    netRevenuePaise: number;
  };
  cogs: {
    openingStockValuationPaise: number;
    purchasesPaise: number;
    closingStockValuationPaise: number;
    directCostOfGoodsSoldPaise: number; // Derived: Opening + Purchases - Closing
  };
  grossProfitPaise: number;            // Net Revenue - COGS
  grossProfitMarginPercent: number;    // (Gross Profit / Net Revenue) * 100
  operatingExpenses: {
    byCategory: Array<{ categoryName: string; amountPaise: number }>;
    totalExpensesPaise: number;
  };
  netOperatingIncomePaise: number;     // Gross Profit - Total Expenses
  netProfitMarginPercent: number;      // (Net Income / Net Revenue) * 100
}

export interface CashFlowReportDTO {
  period: { startDate: string; endDate: string };
  inflows: {
    collectionsFromCustomersPaise: number;
    otherIncomePaise: number;
    totalInflowPaise: number;
  };
  outflows: {
    supplierPaymentsPaise: number;
    operationalExpensesPaise: number;
    totalOutflowPaise: number;
  };
  netCashFlowPaise: number;            // Inflows - Outflows
}
```

---

## 4. Database Tables
The Financial Reporting Module derives all results dynamically from immutable source tables:
- `sales_invoices` & `credit_notes`
- `purchase_bills` & `debit_notes`
- `inventory_movements` (historical stock valuation at start & end of period)
- `expenses`
- `collections`

---

## 5. API Endpoints

### 5.1 GET `/api/v1/reports/profit-loss`
- **Description:** Generate complete Profit & Loss statement for specified date range.
- **Query Params:** `startDate=2026-04-01&endDate=2026-11-19`
- **Success Response (200 OK):** `ApiResponse<ProfitLossReportDTO>`

### 5.2 GET `/api/v1/reports/cash-flow`
- **Description:** Generate Operating Cash Flow report.
- **Query Params:** `startDate=2026-11-01&endDate=2026-11-19`
- **Success Response (200 OK):** `ApiResponse<CashFlowReportDTO>`

### 5.3 GET `/api/v1/reports/product-profitability`
- **Description:** Margin breakdown by product SKU.
- **Success Response (200 OK):** `ApiResponse<ProductProfitabilityItemDTO[]>`

---

## 6. Business Rules & Financial Invariants

### 6.1 Profit & Loss Calculation Laws:
1. **Gross Revenue:**
   $$\text{Gross Revenue} = \sum \text{sales\_invoices.subtotal\_paise}$$
   (Excludes collected GST taxes, as taxes are balance sheet liabilities owed to government, not revenue).
2. **Net Revenue:**
   $$\text{Net Revenue} = \text{Gross Revenue} - \sum \text{credit\_notes.taxable\_amount\_paise}$$
3. **Cost of Goods Sold (COGS):**
   $$\text{COGS} = \text{Opening Stock Valuation} + \text{Inward Purchases} - \text{Closing Stock Valuation}$$
   Alternatively verified against actual dispatched unit costs:
   $$\text{COGS} = \sum (\text{dispatched\_qty\_units} \times \text{weighted\_avg\_cost\_paise})$$
4. **Gross Profit:**
   $$\text{Gross Profit} = \text{Net Revenue} - \text{COGS}$$
5. **Net Operating Income:**
   $$\text{Net Income} = \text{Gross Profit} - \sum \text{expenses.amount\_paise}$$

---

## 7. Validation Rules
- `startDate` and `endDate` are mandatory strings matching format `YYYY-MM-DD`.
- `startDate` must precede or equal `endDate`.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INVALID_FINANCIAL_PERIOD` | 400 | Date range invalid or span greater than 5 fiscal years |
| `INSUFFICIENT_PERIOD_DATA` | 200 | Returns valid zeroed report structure with descriptive notice |

---

## 9. Authorization Requirements
- Restricted strictly to `OWNER` role.

---

## 10. Dependencies
- Queries `SalesModule`, `PurchasingModule`, `InventoryModule`, `ExpenseModule`, `CollectionModule`.

---

## 11. Edge Cases
1. **Zero Revenue Period:** When Net Revenue is 0, Gross Profit Margin and Net Profit Margin report `0.0%` rather than `NaN`.
2. **Negative Gross Profit (Loss on Sales):** If goods are sold below cost, Gross Profit is negative integer paise and margins reflect negative percentages.

---

## 12. Test Cases
1. **TC-FIN-01:** With ₹1,00,000 Net Sales, ₹60,000 COGS, and ₹15,000 Opex, system outputs ₹40,000 Gross Profit (40.0%) and ₹25,000 Net Profit (25.0%).
2. **TC-FIN-02:** Sales return of ₹10,000 accurately reduces Gross Sales to compute correct Net Revenue.
3. **TC-FIN-03:** Non-owner role attempting to access `/api/v1/reports/profit-loss` is rejected with 403 Forbidden.
