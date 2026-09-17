/**
 * 健澜科技杠OS - 多因素认证（MFA）服务
 *
 * 提供 TOTP 绑定（先生成密钥、扫码后用首组动态码确认）、登录/敏感操作二次校验、
 * 一次性备份码、TOTP 重放保护与停用。存储通过 IMfaStore 抽象，默认进程内实现；
 * 生产环境应实现基于 PostgreSQL/Redis 的 Store（密钥建议加密落库）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import {
  generateBackupCodes,
  hashBackupCode,
  matchesBackupCode,
} from './backupCodes.js';
import {
  buildOtpauthUri,
  generateSecret,
  type TotpOptions,
  verifyTotp,
} from './totp.js';

export interface MfaEnrollment {
  userId: string;
  secret: string;
  enabled: boolean;
  issuer: string;
  accountName: string;
  backupHashes: string[];
  createdAt: number;
  confirmedAt?: number;
  /** 上一次成功使用的 TOTP 绝对计数器，用于拒绝同一口令重放 */
  lastUsedCounter?: number;
}

export interface IMfaStore {
  get(userId: string): MfaEnrollment | undefined;
  put(enrollment: MfaEnrollment): void;
  delete(userId: string): void;
}

export class InMemoryMfaStore implements IMfaStore {
  private readonly map = new Map<string, MfaEnrollment>();
  get(userId: string): MfaEnrollment | undefined {
    return this.map.get(userId);
  }
  put(enrollment: MfaEnrollment): void {
    this.map.set(enrollment.userId, enrollment);
  }
  delete(userId: string): void {
    this.map.delete(userId);
  }
}

export interface BeginEnrollResult {
  ok: boolean;
  secret?: string;
  otpauthUri?: string;
  error?: 'ALREADY_ENABLED' | 'PENDING_EXISTS';
}

export interface ConfirmEnrollResult {
  ok: boolean;
  /** 一次性备份码明文，仅在确认成功时返回这一次，需提示用户离线保存 */
  backupCodes?: string[];
  error?: 'NO_PENDING_ENROLLMENT' | 'INVALID_TOKEN' | 'ALREADY_ENABLED';
}

export type VerifyResult =
  | { ok: true; method: 'totp' | 'backup' }
  | { ok: false; error: 'NOT_ENABLED' | 'INVALID_TOKEN' | 'TOKEN_REPLAYED' };

const DEFAULT_ISSUER = '健澜科技杠OS';

export class MfaService {
  private readonly period: number;

  constructor(
    private readonly store: IMfaStore = new InMemoryMfaStore(),
    options: TotpOptions = {},
  ) {
    this.period = options.period ?? 30;
  }

  isEnabled(userId: string): boolean {
    return this.store.get(userId)?.enabled === true;
  }

  /** 第一步：生成密钥与 otpauth URI（尚未启用，需 confirmEnroll 确认） */
  beginEnroll(
    userId: string,
    params: { accountName: string; issuer?: string } = { accountName: userId },
  ): BeginEnrollResult {
    const existing = this.store.get(userId);
    if (existing?.enabled) return { ok: false, error: 'ALREADY_ENABLED' };
    if (existing) return { ok: false, error: 'PENDING_EXISTS' };

    const issuer = params.issuer ?? DEFAULT_ISSUER;
    const secret = generateSecret();
    this.store.put({
      userId,
      secret,
      enabled: false,
      issuer,
      accountName: params.accountName,
      backupHashes: [],
      createdAt: Date.now(),
    });
    return {
      ok: true,
      secret,
      otpauthUri: buildOtpauthUri({ secret, issuer, accountName: params.accountName }),
    };
  }

  /** 第二步：用验证器生成的首组动态码确认绑定，成功后启用并签发备份码 */
  confirmEnroll(userId: string, token: string): ConfirmEnrollResult {
    const enrollment = this.store.get(userId);
    if (!enrollment) return { ok: false, error: 'NO_PENDING_ENROLLMENT' };
    if (enrollment.enabled) return { ok: false, error: 'ALREADY_ENABLED' };

    const delta = verifyTotp(token, enrollment.secret, { period: this.period });
    if (delta === null) return { ok: false, error: 'INVALID_TOKEN' };

    const plainCodes = generateBackupCodes(10);
    const now = Date.now();
    this.store.put({
      ...enrollment,
      enabled: true,
      confirmedAt: now,
      backupHashes: plainCodes.map(hashBackupCode),
      lastUsedCounter: Math.floor(now / 1000 / this.period) + delta,
    });
    return { ok: true, backupCodes: plainCodes };
  }

  /** 校验登录第二步或敏感操作的动态码 / 备份码 */
  verify(userId: string, token: string): VerifyResult {
    const enrollment = this.store.get(userId);
    if (!enrollment?.enabled) return { ok: false, error: 'NOT_ENABLED' };

    // 1) TOTP（含重放保护）
    const delta = verifyTotp(token, enrollment.secret, { period: this.period });
    if (delta !== null) {
      const currentCounter = Math.floor(Date.now() / 1000 / this.period);
      const absoluteCounter = currentCounter + delta;
      if (
        enrollment.lastUsedCounter !== undefined &&
        absoluteCounter <= enrollment.lastUsedCounter
      ) {
        return { ok: false, error: 'TOKEN_REPLAYED' };
      }
      this.store.put({ ...enrollment, lastUsedCounter: absoluteCounter });
      return { ok: true, method: 'totp' };
    }

    // 2) 一次性备份码（命中即删除，保证只用一次）
    const idx = enrollment.backupHashes.findIndex((h) => matchesBackupCode(token, h));
    if (idx >= 0) {
      const remaining = enrollment.backupHashes.slice();
      remaining.splice(idx, 1);
      this.store.put({ ...enrollment, backupHashes: remaining });
      return { ok: true, method: 'backup' };
    }

    return { ok: false, error: 'INVALID_TOKEN' };
  }

  /** 停用 MFA（需再次验证动态码/备份码，防止他人关闭二次认证） */
  disable(userId: string, token: string): boolean {
    const result = this.verify(userId, token);
    if (!result.ok) return false;
    this.store.delete(userId);
    return true;
  }

  /** 查询剩余可用备份码数量（不暴露明文） */
  remainingBackupCodes(userId: string): number {
    return this.store.get(userId)?.backupHashes.length ?? 0;
  }
}
