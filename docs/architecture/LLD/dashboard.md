# Low-Level Design: Dashboard Module

**Module Name:** Executive & Operational Dashboard (`dashboard`)  
**File Reference:** `docs/architecture/LLD/dashboard.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Dashboard Module aggregates, computes, and renders real-time business health metrics, key performance indicators (KPIs), operational alerts, low-stock warnings, and cash-flow summaries for executive decision-making.

---

## 2. Responsibilities
- Aggregate real-time metrics for Today, This Month, and Custom Date Ranges.
- Present immediate financial KPIs: Total Sales, Collections, Pending Receivables, Pending Payables, and Month-to-Date Net Profit estimate.
- Provide actionable operational alerts: Critical Low Stock Items, Overdue Customer Invoices, and Overdue Supplier Bills.
- Render high-level trend summaries (Last 30 Days Sales vs. Collections).

---

## 3. Input and Output Contracts

```typescript
export interface DashboardQueryDTO {
  period?: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface MetricCardDTO {
  amountPaise: number;
  formattedAmount: string; // e.g. "₹1,45,200.00"
  changePercentage: number; // vs previous period
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
}

export interface LowStockAlertDTO {
  productId: string;
  sku: string;
  name: string;
  currentStockUnits: number; // e.g. 12.500
  minStockAlertLevel: number;
  deficitUnits: number;
}

export interface OverdueInvoiceDTO {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  dueDate: string;
  overdueDays: number;
  outstandingPaise: number;
}

export interface DashboardSummaryResponseDTO {
  salesRevenue: MetricCardDTO;
  collections: MetricCardDTO;
  accountsReceivable: MetricCardDTO;
  accountsPayable: MetricCardDTO;
  estimatedNetProfit: MetricCardDTO;
  lowStockAlerts: LowStockAlertDTO[];
  overdueInvoices: OverdueInvoiceDTO[];
  recentActivity: Array<{
    id: string;
    type: 'SALE' | 'PURCHASE' | 'COLLECTION' | 'EXPENSE';
    referenceNumber: string;
    partyName: string;
    amountPaise: number;
    timestamp: string;
  }>;
}
```

---

## 4. Database Tables
The Dashboard module does not maintain dedicated transactional tables; it computes aggregations over core domain tables with indexed views or efficient indexed queries:
- `sales_invoices` (status, invoice_date, total_amount_paise, paid_amount_paise)
- `purchase_bills` (status, bill_date, total_amount_paise, paid_amount_paise)
- `collections` (payment_date, amount_paise)
- `expenses` (expense_date, amount_paise)
- `inventory_balances` (current_stock_milli_units)
- `products` (min_stock_alert_level)

---

## 5. API Endpoints

### 5.1 GET `/api/v1/dashboard/summary`
- **Description:** Returns aggregate KPI cards, alerts, and recent transactions.
- **Query Params:** `period=THIS_MONTH` or `startDate=2026-11-01&endDate=2026-11-19`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "salesRevenue": {
      "amountPaise": 24500000,
      "formattedAmount": "₹2,45,000.00",
      "changePercentage": 14.5,
      "trend": "UP"
    },
    "collections": {
      "amountPaise": 21000000,
      "formattedAmount": "₹2,10,000.00",
      "changePercentage": 8.2,
      "trend": "UP"
    },
    "accountsReceivable": {
      "amountPaise": 7800000,
      "formattedAmount": "₹78,000.00",
      "changePercentage": -4.1,
      "trend": "DOWN"
    },
    "accountsPayable": {
      "amountPaise": 5200000,
      "formattedAmount": "₹52,000.00",
      "changePercentage": 2.0,
      "trend": "NEUTRAL"
    },
    "lowStockAlerts": [
      {
        "productId": "prod_1",
        "sku": "WOOD-OAK-01",
        "name": "Oak Veneer Sheet",
        "currentStockUnits": 4,
        "minStockAlertLevel": 10,
        "deficitUnits": 6
      }
    ]
  }
}
```

---

## 6. Business Rules
1. **Financial Period Boundaries:** Calculations are bounded strictly in UTC calendar days.
2. **Receivable/Payable Calculation:**
   - Accounts Receivable = Total Sales Invoices issued minus Total Collections allocated.
   - Accounts Payable = Total Confirmed Purchase Bills minus Total Disbursements.
3. **Low Stock Detection:** Any active product where `inventory_balances.current_stock_milli_units <= products.min_stock_alert_level * 1000` is immediately flagged.
4. **Overdue Invoices:** Invoices where `due_date < current_date` and `paid_amount_paise < total_amount_paise`.

---

## 7. Validation Rules
- `startDate` & `endDate`: ISO 8601 `YYYY-MM-DD` date strings. `startDate` must be <= `endDate`.
- `period`: Must be one of `TODAY`, `THIS_WEEK`, `THIS_MONTH`, `LAST_30_DAYS`, `CUSTOM`.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INVALID_DATE_RANGE` | 400 | `startDate` is greater than `endDate` or invalid format |
| `QUERY_TIMEOUT` | 504 | Aggregation query execution exceeded threshold |

---

## 9. Authorization Requirements
- Authenticated user required.
- Restricted to `OWNER` or `ADMIN` roles.

---

## 10. Dependencies
- `ISalesService` & `IPurchaseService`: Query invoice and bill aggregations.
- `IInventoryService`: Query stock balances vs. reorder thresholds.
- `ICollectionService`: Query cash receipts.

---

## 11. Edge Cases
1. **Zero Transactions in Period:** Returns structured payload with `0` amounts; avoids division by zero in trend calculation (`changePercentage: 0`).
2. **Partial Payments:** Accurately deducts partial payments from total invoice sums.
3. **Soft-Deleted / Inactive Products:** Excluded from low stock alerts unless active stock is negative.

---

## 12. Test Cases
1. **TC-DASH-01:** Returns accurate sales and collection totals for `THIS_MONTH`.
2. **TC-DASH-02:** Product with current stock 4 and alert level 10 appears in `lowStockAlerts` with deficit 6.
3. **TC-DASH-03:** Unpaid invoice with `due_date` 5 days in the past appears in `overdueInvoices` with `overdueDays = 5`.
