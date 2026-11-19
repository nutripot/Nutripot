# Security Architecture & Threat Model: BusinessHub Enterprise

**Document Reference:** `docs/security/SECURITY.md`  
**Version:** 1.0.0  
**Security Standard:** OWASP Top 10 Enterprise Baseline  
**Target Infrastructure:** Cloudflare Workers, Cloudflare D1, Cloudflare R2  

---

## 1. Security Philosophy: Secure-by-Design

The BusinessHub Enterprise Management System handles sensitive business financial ledgers, inventory valuations, customer and supplier lists, bank details, and tax registrations. Security is not an afterthought or an external layer; it is designed into every architectural boundary, repository contract, and database trigger.

---

## 2. Threat Modeling & OWASP Top 10 Mitigations

| Threat Vector | Risk Description | Architectural Mitigation in BusinessHub |
|---|---|---|
| **A01: Broken Access Control** | User accesses unauthorized tenant data or administrative functions. | Strict single-owner / controlled role-based access. Every API endpoint enforces session authentication at the Worker router level. Context-derived `userId` is used for all writes; client-provided user IDs in payloads are rejected. |
| **A02: Cryptographic Failures** | Exposed passwords or weak token entropy. | Credential hashing uses PBKDF2-SHA256 with 100,000 iterations and 16-byte random salts via WebCrypto. Session tokens are 256-bit cryptographically secure random bytes; tokens are stored in D1 only as SHA-256 hashes. |
| **A03: Injection (SQLi / Command)** | Attacker injects malicious SQL via user inputs. | 100% of database queries execute through Cloudflare D1 parameterized statements (`db.prepare().bind()`). Dynamic string concatenation into SQL statements is prohibited and blocked by code review. |
| **A04: Insecure Design** | Flawed business logic (e.g. negative stock, balance corruption). | Database-level triggers prevent mutation or deletion of immutable ledgers (`inventory_movements`, `customer_ledger`, `supplier_ledger`, `audit_logs`). Negative stock is blocked at the transaction level. |
| **A05: Security Misconfiguration** | Exposed stack traces, debug headers, unencrypted cookies. | Production error responses use standardized generic envelopes (`code`, `message`). Raw stack traces and database errors are logged internally but never returned to clients. Cookies strictly enforce `HttpOnly; Secure; SameSite=Strict`. |
| **A06: Vulnerable Components** | Outdated or malicious external packages. | Zero dependencies on bulky, unvetted npm packages. Runtime relies exclusively on standard Web APIs (WebCrypto, Fetch, Streams) and typed lightweight libraries. |
| **A07: Identification & Auth Failures** | Brute force attacks on login endpoint. | IP-based rate limiting (5 failed attempts per 15 minutes). No public self-registration. |
| **A08: Software & Data Integrity** | Tampering with financial records or audit trails. | Database triggers actively block `UPDATE` and `DELETE` on all append-only tables, raising fatal SQLite errors if attempted even by administrative code. |
| **A09: Security Logging Failures** | Actions performed without audit tracking. | Dedicated `audit_logs` table records actor, timestamp, action code, entity ID, and before/after JSON states for all state-changing operations. |
| **A10: Server-Side Request Forgery** | Attacker causes server to make arbitrary requests. | System does not make dynamic outbound HTTP requests based on user-supplied URLs. |

---

## 3. Session Security Architecture

```
Client (Browser)                           Cloudflare Worker (Edge)
      |                                              |
      |-- 1. POST /api/v1/auth/login --------------->|
      |   (email, password)                          |-- 2. Verify PBKDF2 hash
      |                                              |-- 3. Generate 32-byte crypto random token
      |                                              |-- 4. Compute tokenHash = SHA-256(token)
      |                                              |-- 5. Store tokenHash in D1 `sessions` table
      |<- 6. 200 OK ---------------------------------|
      |   Set-Cookie: session_token=<token>;         |
      |   Path=/api; HttpOnly; Secure;               |
      |   SameSite=Strict; Max-Age=604800            |
      |                                              |
      |-- 7. GET /api/v1/dashboard/summary --------->|
      |   Cookie: session_token=<token>              |-- 8. Compute tokenHash = SHA-256(token)
      |                                              |-- 9. Verify in D1: tokenHash AND expires_at > NOW
      |                                              |-- 10. Bind session.user_id to Request Context
      |<- 11. 200 OK (Data Payload) -----------------|
```

### Cookie Attribute Guarantees:
- `HttpOnly`: Client-side JavaScript cannot access `document.cookie`, preventing session hijacking via Cross-Site Scripting (XSS).
- `Secure`: Cookie is transmitted solely across encrypted TLS connections.
- `SameSite=Strict`: Browser will not attach the cookie to cross-site requests, providing native immunity against Cross-Site Request Forgery (CSRF).
- `Path=/api`: Limits scope of cookie transmission to API paths.

---

## 4. Input Validation & Defense-in-Depth

- **Strict Type Validation:** All incoming request bodies are validated against typed **Zod** schemas before reaching service logic.
- **Payload Stripping:** Unknown fields not defined in the schema are stripped automatically (`strip()`), preventing mass-assignment vulnerabilities.
- **Range & Bound Validation:** Numeric values enforce business limits (e.g. `amount_paise > 0`, `quantity_milli_units > 0`, `tax_rate_bps IN (0, 500, 1200, 1800, 2800)`).
- **String Sanitization:** All text inputs are trimmed; HTML tags are escaped before storage to prevent stored XSS.

---

## 5. File Upload Security (Cloudflare R2)

When uploading business logos or expense receipts to Cloudflare R2:
1. **MIME Type Whitelist:** Only `image/jpeg`, `image/png`, `image/webp`, and `application/pdf` are accepted.
2. **Magic Byte Verification:** The server inspects initial file header bytes to confirm actual content type, preventing renamed executable files (`.exe`, `.php`, `.js`).
3. **File Size Enforcement:** Maximum upload size is strictly capped at 10MB (`10 * 1024 * 1024` bytes).
4. **Isolated Path Storage:** Files are stored in R2 with UUID-generated keys (`receipts/2026/11/{uuid}.pdf`). Original user-provided filenames are discarded to prevent directory traversal attacks (`../../evil.sh`).

---

## 6. Secrets Management

- **Zero Hardcoded Secrets:** All secret keys (session signing secrets, R2 bucket credentials, bootstrap master keys) are injected via Cloudflare Worker environment bindings (`env.SECRET_KEY`).
- In production, secrets are managed exclusively through Wrangler CLI:
  ```bash
  wrangler secret put JWT_SECRET
  wrangler secret put BOOTSTRAP_KEY
  ```
- No `.env` files containing production secrets are committed to source control (`.gitignore` rules enforced).

---

## 7. Audit Trail & Non-Repudiation

Every write operation records an immutable row in `audit_logs`:
- `user_id`: Authenticated user executing the transaction.
- `action`: Specific standardized code (e.g. `SALES_INVOICE_CONFIRMED`).
- `entity_type`: Target domain entity (e.g. `sales_invoices`).
- `entity_id`: Primary key of affected record.
- `old_values_json`: Snapshot of previous record state.
- `new_values_json`: Snapshot of updated state.
- `ip_address`: Client IP address from Cloudflare `CF-Connecting-IP` header.
- `created_at`: UTC timestamp.

Attempts to update or delete rows in `audit_logs` trigger SQLite database errors via native database triggers.
