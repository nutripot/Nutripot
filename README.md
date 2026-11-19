# BusinessHub Enterprise Management System

[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith-blue.svg)](#)
[![Runtime](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-orange.svg)](#)
[![Database](https://img.shields.io/badge/Database-Cloudflare%20D1%20(SQLite)-lightgrey.svg)](#)
[![Precision](https://img.shields.io/badge/Precision-Integer%20Paise%20Math-green.svg)](#)

> **A scalable, modular, secure, maintainable Business Management System engineered for enterprise reliability, high-performance edge execution, and exact financial precision.**

---

## 1. System Overview

BusinessHub is a comprehensive business management platform built to replace fragmented spreadsheets, paper registers, and disconnected billing apps with a single, highly performant, serverless operational ledger.

### Key Capabilities:
- **Procurement & Inward Logistics:** Vendor management, Purchase Orders, Goods Receipt Bills, Debit Notes, and Accounts Payable tracking.
- **Warehouse & Inventory:** Append-only stock movement ledger, real-time balances, Weighted Average Costing (WAC), negative stock prevention, and cycle count adjustments.
- **Sales & Outward Billing:** Client CRM, Quotations, GST Tax Invoices (Intra-state & Inter-state), Credit Notes, and Accounts Receivable aging.
- **Collections & Cash Flow:** Multi-mode receipts (Cash, Bank, UPI, Cheque), automated FIFO invoice allocation, and unallocated advance credit management.
- **Operational Expenses:** Categorized overhead expenditure, R2 receipt document archiving, and tax deduction tracking.
- **Financial Intelligence:** Real-time Profit & Loss statement, Cost of Goods Sold (COGS) derivation, Balance Sheet summary, and GSTR-1 compliance reporting.
- **Enterprise Security:** Single-owner secure bootstrap, PBKDF2-SHA256 password hashing, opaque session tokens in `HttpOnly; SameSite=Strict` cookies, database triggers enforcing ledger immutability, and comprehensive audit logs.

---

## 2. Technology Stack & Architectural Principles

- **Deployment Model:** Modular Monolith on **Cloudflare Workers** (Global V8 Serverless Isolates).
- **Relational Database:** **Cloudflare D1** (SQLite edge database with transactional boundaries and foreign key constraints).
- **Object Storage:** **Cloudflare R2** (S3-compatible storage for logos, receipts, and invoice documents).
- **Language & Type Safety:** **TypeScript** in strict mode (no untyped `any`).
- **Precision Financial Arithmetic:** All monetary fields stored and computed as **integer paise** ($1\text{ INR} = 100\text{ paise}$). Quantities tracked in **integer milli-units** ($1.000\text{ unit} = 1000\text{ milli-units}$).

---

## 3. High-Level Architecture

```
+---------------------------------------------------------------------------------------+
|                                  PRESENTATION LAYER                                   |
|   SPA / Static Client (React, TypeScript, Tailwind CSS, Reusable Design System)        |
+---------------------------------------------------------------------------------------+
                                           |  HTTPS / REST JSON (/api/v1/*)
                                           v
+---------------------------------------------------------------------------------------+
|                                  APPLICATION LAYER                                    |
|   Cloudflare Worker Router, Middleware (Auth, CORS, Rate Limit, Input Validation)    |
+---------------------------------------------------------------------------------------+
                                           |  DTOs & Commands
                                           v
+---------------------------------------------------------------------------------------+
|                             DOMAIN / BUSINESS LOGIC LAYER                             |
|   Domain Services (SalesService, InventoryService, PurchaseService, FinancialService) |
|   - Invariant Enforcement, State Transitions, Double-Entry Validations                |
+---------------------------------------------------------------------------------------+
                                           |  Domain Entities & Interface Calls
                                           v
+---------------------------------------------------------------------------------------+
|                              REPOSITORY / DATA ACCESS LAYER                           |
|   Repositories (SalesRepo, InventoryRepo, LedgerRepo, AuthRepo)                      |
|   - Parameterized SQL, D1 Prepared Statements, Unit-of-Work Transactions              |
+---------------------------------------------------------------------------------------+
                                           |  Prepared SQL Statements
                                           v
+---------------------------------------------------------------------------------------+
|                                 INFRASTRUCTURE LAYER                                  |
|   Cloudflare D1 (SQLite Edge DB)       Cloudflare R2 (Document / Media Storage)       |
+---------------------------------------------------------------------------------------+
```

---

## 4. Documentation Index

The complete engineering, architectural, and operational documentation is maintained in the `docs/` repository:

| Document | Purpose | File Path |
|---|---|---|
| **Project Status** | Execution phases, checklist, and active milestones | [PROJECT_STATUS.md](file:///d:/QQ/BusinessHub/PROJECT_STATUS.md) |
| **Requirements** | Comprehensive Functional and Non-Functional Specs | [docs/requirements.md](file:///d:/QQ/BusinessHub/docs/requirements.md) |
| **High-Level Design (HLD)** | System topology, data flows, and module dependencies | [docs/architecture/HLD.md](file:///d:/QQ/BusinessHub/docs/architecture/HLD.md) |
| **Low-Level Design (LLD)** | 13 detailed module specifications & contracts | [docs/architecture/LLD/](file:///d:/QQ/BusinessHub/docs/architecture/LLD/) |
| **Database Schema** | Full relational DDL, ERD, and integrity triggers | [docs/database/schema.md](file:///d:/QQ/BusinessHub/docs/database/schema.md) |
| **API Specification** | Versioned `/api/v1` REST endpoints and error codes | [docs/api/API.md](file:///d:/QQ/BusinessHub/docs/api/API.md) |
| **Security Architecture** | OWASP Top 10 threat modeling and defenses | [docs/security/SECURITY.md](file:///d:/QQ/BusinessHub/docs/security/SECURITY.md) |
| **Deployment & Ops** | Cloudflare Workers, Wrangler bindings, and backups | [docs/deployment/DEPLOYMENT.md](file:///d:/QQ/BusinessHub/docs/deployment/DEPLOYMENT.md) |
| **Testing Strategy** | Invariant testing, QA tiers, and release gates | [docs/testing/TESTING.md](file:///d:/QQ/BusinessHub/docs/testing/TESTING.md) |
| **Contributing** | Engineering conventions, Git workflow, code review | [CONTRIBUTING.md](file:///d:/QQ/BusinessHub/CONTRIBUTING.md) |

---

## 5. Module Low-Level Design (LLD) Directory

1. [Authentication LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/authentication.md)
2. [Dashboard LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/dashboard.md)
3. [Product Management LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/products.md)
4. [Inventory Management LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/inventory.md)
5. [Purchasing LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/purchases.md)
6. [Supplier Management LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/suppliers.md)
7. [Sales & Invoicing LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/sales.md)
8. [Customer Management LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/customers.md)
9. [Collections LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/collections.md)
10. [Expenses LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/expenses.md)
11. [Financial Reporting LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/financial-reporting.md)
12. [Operational Reports LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/reports.md)
13. [Settings & Admin LLD](file:///d:/QQ/BusinessHub/docs/architecture/LLD/settings.md)

---

## 6. Quickstart: Verifying Migrations & Schema

You can verify database schema migrations locally using the automated SQLite test harness:

```bash
# Run migration verification test suite
python tests/test_migrations.py
```

Expected output:
```
Applied 0001_initial_schema.sql
Applied 0002_triggers_and_indexes.sql
Applied 0003_seed_data.sql
Total tables created: 22
PASS: Foreign Key constraint verified
PASS: Immutability trigger correctly blocked UPDATE
PASS: Immutability trigger correctly blocked DELETE
ALL DATABASE TESTS PASSED WITH 100% INTEGRITY VERIFICATION!
```
