/**
 * 健澜科技杠OS - PgMfaStore 单测
 *
 * 用内存 Fake SQL 执行器模拟 PostgreSQL，验证：
 *  - 因子持久化往返正确、密钥密文落库
 *  - UPSERT 更新与删除
 *  - 多个 PgMfaStore 实例共享同一数据库（模拟多副本部署）时 MFA 状态一致
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { describe, expect, it } from 'bun:test';

import {
  InMemoryMfaStore,
  type MfaSecretCipher,
  MfaService,
  PgMfaStore,
  type SqlExecutor,
  totp,
} from '@/security/mfa/index.js';

/** 测试用可逆"加密"（base64，仅用于验证密文不落地明文，严禁用于生产） */
const testCipher: MfaSecretCipher = {
  encrypt: async (p) => Buffer.from(p, 'utf8').toString('base64'),
  decrypt: async (c) => Buffer.from(c, 'base64').toString('utf8'),
};

/** 最小内存 SQL 执行器，仅实现 PgMfaStore 使用的三类语句 */
class FakeDb implements SqlExecutor {
  readonly table = new Map<string, Record<string, unknown>>();
  async query<T extends object>(
    text: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[] }> {
    if (text.trimStart().startsWith('SELECT')) {
      const row = this.table.get(String(params[0]));
      return { rows: (row ? [row] : []) as T[] };
    }
    if (text.trimStart().startsWith('INSERT')) {
      this.table.set(String(params[0]), {
        user_id: params[0],
        secret_cipher: params[1],
        enabled: params[2],
        issuer: params[3],
        account_name: params[4],
        backup_hashes: params[5],
        last_used_counter: params[6],
        created_at: params[7],
        confirmed_at: params[8],
        updated_at: params[9],
      });
      return { rows: [] };
    }
    if (text.trimStart().startsWith('DELETE')) {
      this.table.delete(String(params[0]));
      return { rows: [] };
    }
    return { rows: [] };
  }
}

describe('PgMfaStore', () => {
  it('put/get 往返正确，且库中密钥为密文', async () => {
    const db = new FakeDb();
    const store = new PgMfaStore(db, testCipher);
    const secret = 'JBSWY3DPK5XXE3DE';
    await store.put({
      userId: 'u1',
      secret,
      enabled: true,
      issuer: '健澜科技杠OS',
      accountName: 'dr_chen',
      backupHashes: ['h1', 'h2'],
      createdAt: 1000,
      confirmedAt: 2000,
      lastUsedCounter: 42,
    });

    // 落库的是密文，不是明文密钥
    const raw = db.table.get('u1');
    expect(raw?.secret_cipher).not.toBe(secret);
    expect(String(raw?.secret_cipher)).not.toContain(secret);

    const got = await store.get('u1');
    expect(got?.secret).toBe(secret);
    expect(got?.enabled).toBe(true);
    expect(got?.backupHashes).toEqual(['h1', 'h2']);
    expect(got?.lastUsedCounter).toBe(42);
    expect(got?.confirmedAt).toBe(2000);
  });

  it('UPSERT 更新而非重复插入，delete 后读不到', async () => {
    const db = new FakeDb();
    const store = new PgMfaStore(db, testCipher);
    await store.put({
      userId: 'u2',
      secret: 'AAAA',
      enabled: false,
      issuer: 'i',
      accountName: 'a',
      backupHashes: [],
      createdAt: 1,
    });
    await store.put({
      userId: 'u2',
      secret: 'BBBB',
      enabled: true,
      issuer: 'i',
      accountName: 'a',
      backupHashes: ['x'],
      createdAt: 1,
    });
    expect(db.table.size).toBe(1);
    expect((await store.get('u2'))?.secret).toBe('BBBB');
    await store.delete('u2');
    expect(await store.get('u2')).toBeUndefined();
  });

  it('多副本：两个服务实例经共享数据库保持 MFA 状态一致', async () => {
    const db = new FakeDb();
    // 实例 A（副本1）完成绑定与确认
    const svcA = new MfaService(new PgMfaStore(db, testCipher));
    const begin = await svcA.beginEnroll('u3', { accountName: 'dr_wang' });
    const secret = begin.secret;
    if (!secret) throw new Error('enroll 未返回 secret');
    const confirm = await svcA.confirmEnroll('u3', totp(secret));
    expect(confirm.ok).toBe(true);
    const backupCodes = confirm.backupCodes;
    if (!backupCodes) throw new Error('confirm 未返回备份码');

    // 实例 B（副本2）使用同一数据库、无任何本地状态
    const svcB = new MfaService(new PgMfaStore(db, testCipher));
    expect(await svcB.isEnabled('u3')).toBe(true);

    // 副本2 用备份码校验成功并一次性消耗（写回共享库）
    const verified = await svcB.verify('u3', backupCodes[0]);
    expect(verified).toEqual({ ok: true, method: 'backup' });

    // 副本1 立刻看到备份码已被消耗（剩余 9）
    expect(await svcA.remainingBackupCodes('u3')).toBe(9);
    // 副本1 重用同一备份码被拒
    expect((await svcA.verify('u3', backupCodes[0])).ok).toBe(false);

    // 进程内存储做不到这一点（对照：两个内存实例互不共享）
    const memA = new MfaService(new InMemoryMfaStore());
    const memB = new MfaService(new InMemoryMfaStore());
    expect(await memA.isEnabled('u3')).toBe(false);
    expect(await memB.isEnabled('u3')).toBe(false);
  });
});
