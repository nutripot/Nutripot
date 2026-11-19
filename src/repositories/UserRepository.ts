// ============================================================================
// BusinessHub Enterprise - UserRepository
// Parameterized Cloudflare D1 operations for Users and Sessions
// ============================================================================

import { IUserRepository, User } from '@/types';

export class UserRepository implements IUserRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db
      .prepare('SELECT id, email, password_hash, password_salt, full_name, role, is_active, created_at, updated_at FROM users WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .prepare('SELECT id, email, password_hash, password_salt, full_name, role, is_active, created_at, updated_at FROM users WHERE email = ? COLLATE NOCASE')
      .bind(email.toLowerCase().trim())
      .first<any>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        'INSERT INTO users (id, email, password_hash, password_salt, full_name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        user.id,
        user.email.toLowerCase().trim(),
        user.passwordHash,
        user.passwordSalt,
        user.fullName,
        user.role,
        user.isActive ? 1 : 0,
        now,
        now
      )
      .run();

    return {
      ...user,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updatePassword(id: string, hash: string, salt: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?')
      .bind(hash, salt, now, id)
      .run();
  }

  async count(): Promise<number> {
    const res = await this.db.prepare('SELECT COUNT(*) as total FROM users').first<{ total: number }>();
    return res?.total || 0;
  }

  private mapRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      fullName: row.full_name,
      role: row.role,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
