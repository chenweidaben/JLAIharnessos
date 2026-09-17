/**
 * 健澜科技杠OS - MFA / TOTP 单测
 *
 * TOTP 使用 RFC 6238 官方 SHA-1 测试向量（8 位）验证算法正确性。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { describe, expect,it } from 'bun:test';

import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateBackupCodes,
  hashBackupCode,
  hotp,
  InMemoryMfaStore,
  matchesBackupCode,
  MfaService,
  normalizeBackupCode,
  totp,
  verifyTotp,
} from '@/security/mfa/index.js';

// RFC 6238 附录 B 测试密钥：ASCII "12345678901234567890"
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const RFC_VECTORS: [number, string][] = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];

describe('Base32 编解码', () => {
  it('往返一致', () => {
    const buf = Buffer.from('hello-健澜', 'utf8');
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
  it('解码 RFC 密钥得到原始 ASCII', () => {
    expect(base32Decode(RFC_SECRET).toString('ascii')).toBe('12345678901234567890');
  });
});

describe('TOTP RFC 6238 官方向量（SHA-1, 8 位）', () => {
  for (const [timeSec, expected] of RFC_VECTORS) {
    it(`t=${timeSec} → ${expected}`, () => {
      expect(hotp(RFC_SECRET, Math.floor(timeSec / 30), { digits: 8 })).toBe(expected);
      expect(totp(RFC_SECRET, { digits: 8, timestamp: timeSec * 1000 })).toBe(expected);
    });
  }
});

describe('TOTP 校验与时间窗口', () => {
  it('当前时刻 6 位口令校验通过', () => {
    const secret = base32Encode(Buffer.from('0123456789abcdef'));
    const token = totp(secret);
    expect(verifyTotp(token, secret)).not.toBeNull();
  });

  it('容忍 ±1 步时钟漂移，拒绝过远漂移', () => {
    const secret = base32Encode(Buffer.from('0123456789abcdef'));
    const t = 1_700_000_000_000;
    const token = totp(secret, { timestamp: t - 30_000 }); // 早一个步长
    expect(verifyTotp(token, secret, { timestamp: t, window: 1 })).toBe(-1);
    expect(verifyTotp(token, secret, { timestamp: t, window: 0 })).toBeNull();
  });

  it('非法格式（非数字/位数不对）直接拒绝', () => {
    const secret = base32Encode(Buffer.from('0123456789abcdef'));
    expect(verifyTotp('abcdef', secret)).toBeNull();
    expect(verifyTotp('12345', secret)).toBeNull();
  });

  it('生成 otpauth URI 含密钥与发行方', () => {
    const uri = buildOtpauthUri({ secret: 'JBSWY3DP', issuer: '健澜科技杠OS', accountName: 'dr_chen' });
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('secret=JBSWY3DP');
    expect(uri).toContain(encodeURIComponent('健澜科技杠OS'));
  });
});

describe('备份码', () => {
  it('生成、规范化、哈希与匹配', () => {
    const codes = generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    for (const c of codes) expect(c).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    const code = codes[0];
    expect(matchesBackupCode(code, hashBackupCode(code))).toBe(true);
    // 输入带空格/小写也能匹配
    expect(matchesBackupCode(' ' + code.toLowerCase() + ' ', hashBackupCode(code))).toBe(true);
    expect(normalizeBackupCode(' abcd-efgh ')).toBe('ABCDEFGH');
  });
});

describe('MfaService 完整生命周期', () => {
  function fresh(): MfaService {
    return new MfaService(new InMemoryMfaStore());
  }

  it('绑定→确认→校验→重放拒绝→备份码一次性→停用', async () => {
    const svc = fresh();
    const userId = 'u_1001';

    // 未启用
    expect(await svc.isEnabled(userId)).toBe(false);
    expect((await svc.verify(userId, '000000')).ok).toBe(false);

    // begin
    const begin = await svc.beginEnroll(userId, { accountName: 'doctor_chen' });
    expect(begin.ok).toBe(true);
    expect(begin.secret).toBeTruthy();
    expect(begin.otpauthUri).toContain('otpauth://totp/');
    // 已存在待确认绑定时再次 begin 被拒绝
    expect((await svc.beginEnroll(userId)).ok).toBe(false);

    // 错误动态码不能确认
    const wrong = await svc.confirmEnroll(userId, '000000');
    expect(wrong.ok).toBe(false);

    // 正确动态码确认
    const secret = begin.secret;
    if (!secret) throw new Error('enroll 未返回 secret');
    const confirm = await svc.confirmEnroll(userId, totp(secret));
    expect(confirm.ok).toBe(true);
    expect(confirm.backupCodes).toHaveLength(10);
    const backupCodes = confirm.backupCodes;
    if (!backupCodes) throw new Error('confirm 未返回备份码');
    expect(await svc.isEnabled(userId)).toBe(true);

    // 已启用不能重复绑定
    expect((await svc.beginEnroll(userId)).error).toBe('ALREADY_ENABLED');

    // 同一 TOTP 口令重放被拒（confirm 已消耗当前步）
    const replay = await svc.verify(userId, totp(secret));
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.error).toBe('TOKEN_REPLAYED');

    // 备份码可用且一次性
    const backup = backupCodes[0];
    const useBackup = await svc.verify(userId, backup);
    expect(useBackup).toEqual({ ok: true, method: 'backup' });
    const reuseBackup = await svc.verify(userId, backup);
    expect(reuseBackup.ok).toBe(false);
    expect(await svc.remainingBackupCodes(userId)).toBe(9);

    // 错误口令
    expect((await svc.verify(userId, '999999')).ok).toBe(false);

    // 停用需验证：错误口令不能停用
    expect(await svc.disable(userId, '999999')).toBe(false);
    expect(await svc.isEnabled(userId)).toBe(true);
    // 用另一备份码停用
    expect(await svc.disable(userId, backupCodes[1])).toBe(true);
    expect(await svc.isEnabled(userId)).toBe(false);
  });
});
