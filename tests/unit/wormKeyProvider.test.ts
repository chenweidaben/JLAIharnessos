/**
 * 健澜AI原生医院操作系统OS - P5-8 KeyProvider + SM2 密钥轮换 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DemoEphemeralKeyProvider, FileKeyProvider, __resetKeyProvider,
} from '../../src/bff/aggregators/wormKeyProvider';

let tmpDir = '';
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'worm-key-'));
  process.env.WORM_KEK = 'a'.repeat(32);
  delete process.env.NODE_ENV;
  delete process.env.DEMO_MODE;
  delete process.env.WORM_FILE_KEY;
});
afterAll(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  __resetKeyProvider(null);
});

describe('P5-8 DemoEphemeralKeyProvider', () => {
  test('productionSafe=false，构造即 warn', () => {
    const p = new DemoEphemeralKeyProvider();
    expect(p.productionSafe).toBe(false);
    expect(p.kind).toBe('demo-ephemeral');
  });
  test('signing key 与公钥配对，verify 通过', () => {
    const p = new DemoEphemeralKeyProvider();
    const { keyId, privateKeyHex } = p.getSigningKey();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sm2 = require('sm-crypto').sm2;
    const sig = sm2.doSignature('deadbeef', privateKeyHex);
    expect(p.verify('deadbeef', sig, keyId).ok).toBe(true);
  });
  test('未知 keyId → unknown-key-id', () => {
    const p = new DemoEphemeralKeyProvider();
    const r = p.verify('deadbeef', '0'.repeat(128), 'unknown-x');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unknown-key-id');
  });
  test('坏签名 → bad-signature', () => {
    const p = new DemoEphemeralKeyProvider();
    const r = p.verify('deadbeef', '1'.repeat(128));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('bad-signature');
  });
  test('rotate 后旧 keyId 仍可验签，新 seal 用新 keyId', () => {
    const p = new DemoEphemeralKeyProvider();
    const k1 = p.activeKeyId();
    const oldPub = p.getPublicKey(k1)!;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sm2 = require('sm-crypto').sm2;
    const sig1 = sm2.doSignature('seg1', p.getSigningKey().privateKeyHex);
    const { fromKeyId, toKeyId } = p.rotate();
    expect(fromKeyId).toBe(k1);
    expect(toKeyId).not.toBe(k1);
    // 旧 keyId 公钥仍在 listKeyIds 里
    expect(p.listKeyIds()).toContain(k1);
    expect(p.getPublicKey(k1)).toBe(oldPub);
    // 旧 keyId 验签仍通过（用旧公钥）
    const v = p.verify('seg1', sig1, k1);
    expect(v.ok).toBe(true);
    // 新 active keyId 已切换
    expect(p.activeKeyId()).toBe(toKeyId);
  });
});

describe('P5-8 FileKeyProvider', () => {
  test('私钥加密落盘，_keys.json 无明文私钥', () => {
    const p = new FileKeyProvider(tmpDir);
    const { privateKeyHex } = p.getSigningKey();
    const ringPath = join(tmpDir, '_keys.json');
    expect(existsSync(ringPath)).toBe(true);
    const content = readFileSync(ringPath, 'utf8');
    // 明文私钥不能出现在文件里
    expect(content.includes(privateKeyHex)).toBe(false);
    // encryptedPrivateKeyHex 字段存在
    expect(content).toContain('encryptedPrivateKeyHex');
  });
  test('重启后从磁盘读回，旧 keyId 仍可验签', () => {
    const p1 = new FileKeyProvider(tmpDir);
    const k1 = p1.activeKeyId();
    const sig1 = (() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sm2 = require('sm-crypto').sm2;
      return sm2.doSignature('seg1', p1.getSigningKey().privateKeyHex);
    })();
    // 新实例模拟重启
    const p2 = new FileKeyProvider(tmpDir);
    expect(p2.activeKeyId()).toBe(k1);
    expect(p2.verify('seg1', sig1, k1).ok).toBe(true);
  });
  test('rotate 后旧段用旧钥、新段用新钥，verify 全 true', () => {
    const p = new FileKeyProvider(tmpDir);
    const k1 = p.activeKeyId();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sm2 = require('sm-crypto').sm2;
    const sigOld = sm2.doSignature('seg-old', p.getSigningKey().privateKeyHex);
    p.rotate();
    const k2 = p.activeKeyId();
    expect(k2).not.toBe(k1);
    const sigNew = sm2.doSignature('seg-new', p.getSigningKey().privateKeyHex);
    expect(p.verify('seg-old', sigOld, k1).ok).toBe(true);
    expect(p.verify('seg-new', sigNew, k2).ok).toBe(true);
  });
  test('未知 keyId → unknown-key-id，其余 keyId 不受影响', () => {
    const p = new FileKeyProvider(tmpDir);
    const k1 = p.activeKeyId();
    const r1 = p.verify('x', '0'.repeat(128), 'unknown-x');
    expect(r1.ok).toBe(false);
    expect(r1.reason).toBe('unknown-key-id');
    // 环里的 keyId 仍在
    expect(p.listKeyIds()).toContain(k1);
  });
  test('未配 WORM_KEK 时 FileKeyProvider 拒绝构造', () => {
    delete process.env.WORM_KEK;
    // 即使回落设了 WORM_SM4_KEY 也不应被复用为 KEK
    process.env.WORM_SM4_KEY = 'b'.repeat(32);
    expect(() => new FileKeyProvider(tmpDir)).toThrow(/worm-kek-not-configured/);
    delete process.env.WORM_SM4_KEY;
  });
  test('encryptedPrivateKeyHex 是真密文（长度对齐 + 真解密回读）', () => {
    const p = new FileKeyProvider(tmpDir);
    const { privateKeyHex } = p.getSigningKey();
    const content = JSON.parse(readFileSync(join(tmpDir, '_keys.json'), 'utf8'));
    const entry = content.ring[0];
    // sm4-crypto CBC 带 PKCS 填充，密文 hex 长度 ≥ 明文；只断言密文比明文长
    expect(entry.encryptedPrivateKeyHex.length).toBeGreaterThan(privateKeyHex.length);
    // 前 32 字符与明文完全不同（不是简单 hex 编码）
    expect(entry.encryptedPrivateKeyHex.slice(0, 32)).not.toBe(privateKeyHex.slice(0, 32));
    // ivHex 存在且非全零
    expect(entry.ivHex.length).toBe(32);
    expect(entry.ivHex).not.toBe('0'.repeat(32));
    // 真解密回读：用 KEK 解开，得到的就是原私钥
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sm4 = require('sm-crypto').sm4;
    const decrypted = sm4.decrypt(entry.encryptedPrivateKeyHex, process.env.WORM_KEK!, { mode: 'cbc', iv: entry.ivHex });
    expect(decrypted).toBe(privateKeyHex);
  });
});
