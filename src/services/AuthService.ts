// ============================================================================
// BusinessHub Enterprise - AuthService
// Identity, credential verification, session lifecycle, and cookie issuance
// ============================================================================

import { IAuthService, IUserRepository, User } from '@/types';
import { generateSessionToken, hashPassword, hashToken, verifyPassword } from '@/lib/auth';

export class AuthService implements IAuthService {
  constructor(
    private userRepo: IUserRepository,
    private db: D1Database
  ) {}

  async login(
    email: string,
    passwordPlain: string,
    ip?: string,
    ua?: string
  ): Promise<{ token: string; user: Omit<User, 'passwordHash' | 'passwordSalt'> }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', statusCode: 401 };
    }

    if (!user.isActive) {
      throw { code: 'ACCOUNT_DISABLED', message: 'Account is deactivated', statusCode: 403 };
    }

    const isValid = await verifyPassword(passwordPlain, user.passwordSalt, user.passwordHash);
    if (!isValid) {
      throw { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', statusCode: 401 };
    }

    // Generate 256-bit token & hash it for D1
    const token = generateSessionToken();
    const tokenHash = await hashToken(token);
    const sessionId = 'ses_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    // 7 day session expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(sessionId, user.id, tokenHash, ip || null, ua || null, expiresAt, now)
      .run();

    const { passwordHash: _, passwordSalt: __, ...sanitizedUser } = user;
    return { token, user: sanitizedUser };
  }

  async logout(token: string): Promise<void> {
    const tokenHash = await hashToken(token);
    await this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }

  async validateSession(token: string): Promise<User | null> {
    const tokenHash = await hashToken(token);
    const now = new Date().toISOString();

    const sessionRow = await this.db
      .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?')
      .bind(tokenHash, now)
      .first<{ user_id: string }>();

    if (!sessionRow) return null;
    return await this.userRepo.findById(sessionRow.user_id);
  }
}
