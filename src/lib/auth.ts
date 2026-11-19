// ============================================================================
// BusinessHub Enterprise - Cryptographic Authentication Library
// Uses WebCrypto PBKDF2-SHA256 (100,000 iterations) and 256-bit entropy tokens
// ============================================================================

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

/**
 * Generates a cryptographically secure random salt (16 bytes) encoded in base64.
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Derives a PBKDF2-SHA256 hash for a given password and salt.
 */
export async function hashPassword(password: string, saltBase64: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBytes = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH_BITS
  );

  const hashBytes = new Uint8Array(derivedBits);
  return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a password against a stored salt and hash in constant time.
 */
export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  if (computedHash.length !== expectedHash.length) return false;
  
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates an opaque 256-bit secure session token (hex string).
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes an opaque token using SHA-256 for secure database lookup.
 */
export async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(token));
  const hashBytes = new Uint8Array(hashBuffer);
  return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parses cookies from request header.
 */
export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(pair => {
    const [name, ...valParts] = pair.trim().split('=');
    if (name) {
      cookies[name] = valParts.join('=');
    }
  });
  return cookies;
}
