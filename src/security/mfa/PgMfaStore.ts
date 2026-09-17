/**
 * 健澜科技杠OS - MFA PostgreSQL 共享存储（多副本生产实现）
 *
 * 默认 InMemoryMfaStore 仅适用于单机/演示：多副本部署时各实例状态不共享。
 * PgMfaStore 把 MFA 因子持久化到 iam.mfa_factors（DDL 见
 * deploy/postgres/init/15-iam-mfa.sql），并对 TOTP 密钥做应用层加密落库；
 * 备份码本就是 SHA-256 哈希，无需再加密。
 *
 * 设计为端口-适配器：不直接依赖 node-postgres，只要求一个具备
 * `query(text, params)` 方法的执行器（node-postgres 的 Pool/Client 结构化兼容，
 * 亦可注入事务客户端）。加密通过最小 Cipher 端口注入，便于测试与对接 KMS。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import type { EncryptionService } from '@/security/encryption/EncryptionService.js';

import type { IMfaStore, MfaEnrollment } from './MfaService.js';

/** 最小 SQL 执行器（node-postgres Pool/Client 结构化兼容） */
export interface SqlExecutor {
  query<T extends object = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}

/** 密钥加解密端口（生产可用 EncryptionService 适配，或对接 KMS） */
export interface MfaSecretCipher {
  encrypt(plainSecret: string): Promise<string>;
  decrypt(cipherText: string): Promise<string>;
}

interface MfaFactorRow {
  user_id: string;
  secret_cipher: string;
  enabled: boolean;
  issuer: string;
  account_name: string;
  backup_hashes: string[];
  last_used_counter: string | number | null;
  created_at: string | number;
  confirmed_at: string | number | null;
  updated_at: string | number;
}

const num = (v: string | number | null | undefined): number | undefined =>
  v === null || v === undefined ? undefined : Number(v);

/**
 * 基于 PostgreSQL 的 MFA 存储。
 *
 * @example
 * ```ts
 * import { Pool } from 'pg';
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 * const cipher = createEncryptionServiceCipher(new EncryptionService());
 * const store = new PgMfaStore(pool, cipher);
 * const mfa = new MfaService(store);
 * ```
 */
export class PgMfaStore implements IMfaStore {
  constructor(
    private readonly db: SqlExecutor,
    private readonly cipher: MfaSecretCipher,
  ) {}

  async get(userId: string): Promise<MfaEnrollment | undefined> {
    const { rows } = await this.db.query<MfaFactorRow>(
      `SELECT user_id, secret_cipher, enabled, issuer, account_name,
                     backup_hashes, last_used_counter, created_at, confirmed_at, updated_at
               FROM iam.mfa_factors WHERE user_id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return undefined;

    const secret = await this.cipher.decrypt(row.secret_cipher);
    return {
      userId: row.user_id,
      secret,
      enabled: row.enabled,
      issuer: row.issuer,
      accountName: row.account_name,
      backupHashes: row.backup_hashes ?? [],
      createdAt: num(row.created_at) ?? 0,
      confirmedAt: num(row.confirmed_at),
      lastUsedCounter: num(row.last_used_counter),
    };
  }

  async put(e: MfaEnrollment): Promise<void> {
    const secretCipher = await this.cipher.encrypt(e.secret);
    const now = Date.now();
    await this.db.query(
      `INSERT INTO iam.mfa_factors
         (user_id, secret_cipher, enabled, issuer, account_name,
          backup_hashes, last_used_counter, created_at, confirmed_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id) DO UPDATE SET
         secret_cipher     = EXCLUDED.secret_cipher,
         enabled           = EXCLUDED.enabled,
         issuer            = EXCLUDED.issuer,
         account_name      = EXCLUDED.account_name,
         backup_hashes     = EXCLUDED.backup_hashes,
         last_used_counter = EXCLUDED.last_used_counter,
         confirmed_at      = EXCLUDED.confirmed_at,
         updated_at        = EXCLUDED.updated_at`,
      [
        e.userId,
        secretCipher,
        e.enabled,
        e.issuer,
        e.accountName,
        e.backupHashes,
        e.lastUsedCounter ?? null,
        e.createdAt,
        e.confirmedAt ?? null,
        now,
      ],
    );
  }

  async delete(userId: string): Promise<void> {
    await this.db.query(`DELETE FROM iam.mfa_factors WHERE user_id = $1`, [userId]);
  }
}

/**
 * 把项目内置 EncryptionService（AES-256-GCM，encryptString/decryptString）
 * 适配为 PgMfaStore 需要的文本级 Cipher：密文以 JSON 字符串形式存库。
 */
export function createEncryptionServiceCipher(encryption: EncryptionService): MfaSecretCipher {
  return {
    async encrypt(plainSecret: string): Promise<string> {
      return JSON.stringify(await encryption.encryptString(plainSecret));
    },
    async decrypt(cipherText: string): Promise<string> {
      return encryption.decryptString(JSON.parse(cipherText) as Parameters<EncryptionService['decryptString']>[0]);
    },
  };
}
