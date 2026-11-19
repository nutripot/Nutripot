# Engineering Standards & Contributing Guidelines

**System:** BusinessHub Enterprise Management System  
**Document Reference:** `CONTRIBUTING.md`  
**Version:** 1.0.0  

---

## 1. Core Engineering Principles

Every engineer contributing to this codebase must adhere strictly to these principles:
1. **Never Compromise Financial Precision:** Floating point types (`float`, `double`, `number` with decimals) are strictly prohibited for monetary values. Store and compute all amounts as integer **paise** ($1\text{ INR} = 100\text{ paise}$).
2. **Double-Entry & Immutability:** Financial ledgers (`customer_ledger`, `supplier_ledger`) and inventory movements (`inventory_movements`) are append-only. Never attempt to execute `UPDATE` or `DELETE` on these tables.
3. **Strict Separation of Concerns:**
   - Presentation components never execute business logic or issue SQL queries.
   - Services do not touch UI state.
   - Repositories handle database interactions via parameterized SQL exclusively.
4. **Zero Untyped Code:** TypeScript strict mode is enabled. The use of `any` is forbidden. Define explicit DTOs and domain interfaces.

---

## 2. Code Organization Standards

```
src/
  ├── app/                  # Application routing, layout, and global providers
  ├── components/           # Reusable UI component library (Design System)
  │     ├── ui/             # Buttons, Badges, Cards, Modals, Inputs
  │     ├── tables/         # Generic DataTable, Pagination, SearchFilters
  │     └── feedback/       # ToastNotification, ConfirmDialog, LoadingState
  ├── features/             # Feature modules (independent vertical slices)
  │     ├── auth/
  │     ├── dashboard/
  │     ├── products/
  │     ├── inventory/
  │     ├── purchases/
  │     ├── suppliers/
  │     ├── sales/
  │     ├── customers/
  │     ├── collections/
  │     ├── expenses/
  │     ├── reports/
  │     └── settings/
  ├── services/             # Independent domain services (business operations)
  ├── repositories/         # D1 database adapters and prepared statements
  ├── types/                # Domain models, API DTOs, and system contracts
  └── utils/                # Centralized formatters (paise to rupees, date, etc.)
```

---

## 3. Formatting & Calculation Conventions

### 3.1 Monetary Formatting:
Always use the centralized currency utility:
```typescript
// Correct:
import { formatPaiseToRupees } from '@/utils/currency';
const displayPrice = formatPaiseToRupees(150050); // "₹1,500.50"

// Prohibited:
const badPrice = "₹" + (priceInPaise / 100).toFixed(2);
```

### 3.2 Quantity Representation:
Quantities are stored in integer milli-units ($1.000\text{ unit} = 1000$):
```typescript
// Correct:
const quantityUnits = quantityMilliUnits / 1000;
```

---

## 4. Git Branching & Commit Conventions

- Use semantic commit messages:
  - `feat(inventory): add cycle count adjustment workflow`
  - `fix(sales): correct odd-paise tax split in intra-state invoices`
  - `test(migrations): add immutability trigger verification`
  - `docs(hld): document collection allocation sequence`
- All PRs must have passing automated invariant tests before merging.
