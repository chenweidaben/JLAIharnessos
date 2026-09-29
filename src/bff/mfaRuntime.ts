/**
 * 健澜科技数智医院智能体 - MFA 运行时单例
 *
 * 把 src/security/mfa 的 MfaService 接入真实 PostgreSQL 持久化：
 *  - 真实模式（DEMO_MODE≠1）：PgMfaStore 落 iam.mfa_factors，TOTP 密钥经
 *    EncryptionService（AES-256-GCM，主密钥落 ./.keys/master.key）加密；
 *    进程重启后同一主密钥可解密历史因子，不丢 MFA。
 *  - 演示模式：回退进程内 InMemoryMfaStore（无 DB）。
 *
 * 多副本/重启一致性由 iam.mfa_factors 保证，不再依赖进程内存。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '@/db/pool.js';
import { EncryptionService } from '@/security/encryption/EncryptionService.js';
import {
  createEncryptionServiceCipher,
  InMemoryMfaStore,
  MfaService,
  PgMfaStore,
  type SqlExecutor,
} from '@/security/mfa/index.js';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

let _mfa: MfaService | null = null;

/** postgres.js → PgMfaStore 需要的 node-postgres 风格 SqlExecutor 适配 */
function pgExecutor(): SqlExecutor {
  const sql = getDb();
  return {
    async query<T extends object = Record<string, unknown>>(
      text: string,
      params: unknown[] = [],
    ): Promise<{ rows: T[] }> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (await sql.unsafe(text, params)) as any as T[];
      return { rows };
    },
  };
}

/** 惰性构造 MFA 服务单例（真实模式走 PostgreSQL 持久化） */
export function getMfaService(): MfaService {
  if (_mfa) return _mfa;
  if (isDemo) {
    _mfa = new MfaService(new InMemoryMfaStore());
  } else {
    const cipher = createEncryptionServiceCipher(new EncryptionService({ keyDir: './.keys' }));
    _mfa = new MfaService(new PgMfaStore(pgExecutor(), cipher));
  }
  return _mfa;
}
