# Testing Strategy & Quality Assurance: BusinessHub Enterprise

**Document Reference:** `docs/testing/TESTING.md`  
**Version:** 1.0.0  
**Testing Standard:** Test-Driven Development (TDD) for Critical Financial & Inventory Invariants  

---

## 1. Quality Assurance Philosophy

In an enterprise resource planning and business management system, bugs are not mere cosmetic inconveniences; a single rounding error, race condition, or stock desynchronization can result in tax filing penalties, stockouts, inaccurate financial statements, and direct financial loss.

Testing is structured in four strict tiers:
```
+-----------------------------------------------------------------------------------+
|                        TIER 4: END-TO-END (E2E) SMOKE TESTS                       |
|   Simulate full browser workflows: Login -> Inward -> Sale -> Collection -> P&L  |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                           TIER 3: API INTEGRATION TESTS                           |
|   HTTP contracts, session cookies, input validation schemas, error envelopes     |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                        TIER 2: DATABASE & INVARIANT TESTS                         |
|   Foreign keys, check constraints, append-only triggers, concurrency transactions |
+-----------------------------------------------------------------------------------+
                                          |
+-----------------------------------------------------------------------------------+
|                         TIER 1: PURE UNIT TESTS (CORE DOMAIN)                     |
|   Paise math, GST tax splits, WAC stock valuation, FIFO allocation logic          |
+-----------------------------------------------------------------------------------+
```

---

## 2. Mandatory Business Logic Invariant Tests

### 2.1 Integer Paise Math Invariant
- **Rule:** Floating-point numbers are prohibited in financial pipelines.
- **Test:** Verify that adding ₹0.10 + ₹0.20 yields exactly ₹0.30 (`10 + 20 == 30` paise) with zero floating-point precision error (`0.30000000000000004`).

### 2.2 Intra-State GST Tax Splitting (Odd Paise Rule)
- **Rule:** In intra-state transactions, CGST + SGST must sum exactly to Total Tax.
- **Test:** For an item with taxable value ₹1.51 and 18% GST:
  $$\text{Total Tax} = \text{round}\left(\frac{151 \times 1800}{10000}\right) = \text{round}(27.18) = 27\text{ paise}$$
  CGST = 14 paise, SGST = 13 paise ($14 + 13 = 27$ paise). No lost paise!

### 2.3 Weighted Average Cost (WAC) Update Invariant
- **Scenario:**
  1. Opening: 10 units @ ₹100.00 (`10000` paise) = ₹1,000.00 (`100000` paise).
  2. Purchase: 5 units @ ₹130.00 (`13000` paise) = ₹650.00 (`65000` paise).
  3. Expected New Average Cost:
     $$\frac{100000 + 65000}{15} = \frac{165000}{15} = 11000\text{ paise (₹110.00)}$$
- **Test:** Verifies calculated WAC equals `11000` paise.

### 2.4 Negative Inventory Block Invariant
- **Scenario:** Current stock is 5 units.
- **Action:** Sale invoice confirmed requesting 6 units.
- **Expected Outcome:** Transaction throws `INSUFFICIENT_STOCK_ERROR`, rolls back all writes, and leaves stock unchanged at 5 units.

### 2.5 Double-Entry Ledger Invariant
- **Rule:** For every customer and supplier ledger:
  $$\text{Current Balance} \equiv \sum \text{Debits} - \sum \text{Credits}$$
- **Test:** Query checks that running balance in row $N$ matches the sum of all historical debits and credits up to row $N$.

### 2.6 Append-Only Immutability Invariant
- **Rule:** `inventory_movements`, `customer_ledger`, `supplier_ledger`, and `audit_logs` are write-once.
- **Test:** Attempting `UPDATE inventory_movements SET ...` or `DELETE FROM inventory_movements ...` raises a SQLite trigger exception.

---

## 3. Automated Test Suites

### 3.1 Suite Directory Structure
```
tests/
  ├── test_migrations.py           # SQLite DDL, triggers, and foreign keys
  ├── test_financial_math.py       # Integer paise, GST split, WAC costing
  ├── test_inventory_service.py    # Stock confirmation, negative stock prevention
  ├── test_sales_and_billing.py    # Invoices, credit limits, tax calculations
  └── test_collections_alloc.py    # Collection settlement and unallocated advance
```

---

## 4. Verification Checklists for Release Gates

Before promoting any change to staging or production:
1. **Linting & Code Style:** `npm run lint` passes with 0 warnings.
2. **Type Safety:** `npm run typecheck` passes with zero `any` types.
3. **Database Integrity:** All migrations execute sequentially on fresh SQLite database.
4. **Automated Test Coverage:** 100% of invariant test cases pass.
5. **No Schema Downgrades:** Migrations must be purely additive.
