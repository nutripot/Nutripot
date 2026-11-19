# Low-Level Design: Authentication Module

**Module Name:** Authentication & Identity (`auth`)  
**File Reference:** `docs/architecture/LLD/authentication.md`  
**Status:** Approved Specification  

---

## 1. Module Purpose
The Authentication Module is responsible for authenticating users, managing session lifecycles, issuing and revoking secure session cookies, enforcing credential security standards, and generating audit logs for all identity-related actions.

---

## 2. Responsibilities
- Secure initial system bootstrap (single-owner setup).
- Cryptographic verification of user credentials using WebCrypto PBKDF2-SHA256 (100,000 iterations) with 16-byte cryptographically secure random salts.
- Issuing opaque 256-bit cryptographically secure session tokens stored in hashed format in Cloudflare D1.
- Management of `HttpOnly`, `SameSite=Strict`, `Secure` session cookies.
- Session revocation on explicit logout and expired token eviction.
- Rate limiting to defend against brute-force and credential-stuffing attacks.

---

## 3. Input and Output Contracts

```typescript
// Input Contract: Login
export interface LoginRequestDTO {
  email: string;      // Normalized lowercase string
  password: string;   // Plaintext password (min 10 chars)
}

// Output Contract: Session Info
export interface UserSessionDTO {
  userId: string;
  email: string;
  fullName: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  createdAt: string;
}

// Input Contract: Password Change
export interface ChangePasswordRequestDTO {
  currentPassword: string;
  newPassword: string;
}

// Standard API Response Envelope
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

---

## 4. Database Tables

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,                       -- UUID v4
    email TEXT UNIQUE NOT NULL COLLATE NOCASE, -- Lowercase normalized
    password_hash TEXT NOT NULL,               -- Base64 encoded PBKDF2 derived key
    password_salt TEXT NOT NULL,               -- Base64 encoded 16-byte random salt
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OWNER',         -- 'OWNER', 'ADMIN', 'STAFF'
    is_active INTEGER NOT NULL DEFAULT 1,      -- 1 = active, 0 = disabled
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,                       -- UUID v4
    user_id TEXT NOT NULL,                     -- Foreign Key to users(id)
    token_hash TEXT UNIQUE NOT NULL,           -- SHA-256 hash of the bearer cookie token
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,                  -- ISO 8601 UTC timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

---

## 5. API Endpoints

### 5.1 POST `/api/v1/auth/login`
- **Description:** Authenticates the user and sets the session cookie.
- **Request Headers:** `Content-Type: application/json`
- **Request Body:** `LoginRequestDTO`
- **Response Headers:** `Set-Cookie: session_token=<opaque_token>; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "usr_01ha...",
    "email": "owner@businesshub.com",
    "fullName": "Business Owner",
    "role": "OWNER"
  }
}
```

### 5.2 POST `/api/v1/auth/logout`
- **Description:** Invalidates the current session token in D1 and clears the cookie.
- **Request Headers:** Cookie containing `session_token`
- **Response Headers:** `Set-Cookie: session_token=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": { "message": "Successfully logged out" }
}
```

### 5.3 GET `/api/v1/auth/me`
- **Description:** Returns the currently authenticated user's profile and active session details.
- **Success Response (200 OK):** `ApiResponse<UserSessionDTO>`
- **Error Response (401 Unauthorized):** `{"success": false, "error": {"code": "UNAUTHORIZED", "message": "Session expired or invalid"}}`

---

## 6. Business Rules
1. **Single-Owner Initialization:** If no user exists in `users` upon system startup, the system enters bootstrap mode, accepting an environment-configured initialization key to create the initial Owner.
2. **Account Lockout:** 5 consecutive failed login attempts within 15 minutes triggers a temporary IP-based block of 15 minutes.
3. **Session Invalidation:** Terminating a session immediately deletes the row in `sessions`, preventing replay attacks.
4. **Token Security:** Raw session tokens are never written to the database; only their SHA-256 hashes are persisted.

---

## 7. Validation Rules
- `email`: Required, valid email format, max 255 characters, case-insensitive.
- `password`: Required, minimum 10 characters, at least one uppercase letter, one lowercase letter, one digit, and one symbol.

---

## 8. Error Handling
| Error Code | HTTP Status | Reason |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Email not found or password hash mismatch |
| `ACCOUNT_DISABLED` | 403 | User account has `is_active = 0` |
| `RATE_LIMIT_EXCEEDED`| 429 | Exceeded 5 failed attempts within 15 minutes |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired session token |

---

## 9. Authorization Requirements
- `/api/v1/auth/login`: Public (rate-limited).
- `/api/v1/auth/logout`: Authenticated session required.
- `/api/v1/auth/me`: Authenticated session required.
- `/api/v1/auth/change-password`: Authenticated session required.

---

## 10. Dependencies
- `CryptoLib`: WebCrypto API (`subtle.digest`, `subtle.deriveBits`, `getRandomValues`).
- `AuditService`: Logs authentication events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`).
- `D1Database`: Session and User persistence.

---

## 11. Edge Cases
1. **Clock Skew:** Worker timestamps are compared in UTC (`datetime('now', 'utc')`).
2. **Expired Cookie Presentation:** If client presents an expired cookie, repository query matches `WHERE expires_at > datetime('now')` and returns null, triggering cookie clearance.
3. **Concurrent Logins:** Multiple sessions from different devices are permitted; each device gets its own distinct `token_hash` row in `sessions`.

---

## 12. Test Cases
1. **TC-AUTH-01:** Correct email and password returns 200 OK, sets `HttpOnly` cookie, and creates session row.
2. **TC-AUTH-02:** Incorrect password returns 401 `INVALID_CREDENTIALS` with identical timing to prevent user enumeration.
3. **TC-AUTH-03:** 6th incorrect password attempt within 15 minutes from same IP returns 429 `RATE_LIMIT_EXCEEDED`.
4. **TC-AUTH-04:** Calling `/api/v1/auth/logout` deletes session row; subsequent `/api/v1/auth/me` returns 401.
