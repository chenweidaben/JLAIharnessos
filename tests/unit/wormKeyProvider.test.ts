/**
 * 健澜AI原生医院操作系统OS - P5-8 KeyProvider + SM2 密钥轮换 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DemoEphemeralKeyProvider, EnvKeyProvider, FileKeyProvider, getKeyProvider, __resetKeyProvider,
} from '../../src/bff/aggregators/wormKeyProvider';

let tmpDir = '';
// 关键：本文件会临时改写进程环境（WORM_KEK / NODE_ENV / DEMO_MODE / WORM_FILE_KEY）。
// 必须先存原值、afterAll 精确还原——否则后续加载的 wormArchiveAggregator
// 在 initKeys() 时读不到 DEMO_MODE=1，SM4/SM2 被置空，seal 全返回 key-not-configured。
const ORIGINAL_ENV: Record<string, string | undefined> = {
  WORM_KEK: process.env.WORM_KEK,
  NODE_ENV: process.env.NODE_ENV,
  DEMO_MODE: process.env.DEMO_MODE,
  WORM_FILE_KEY: process.env.WORM_FILE_KEY,
  WORM_SM4_KEY: process.env.WORM_SM4_KEY,
};
function restoreEnv(key: string): void {
  const v = ORIGINAL_ENV[key];
  if (v === undefined) delete process.env[key];
  else process.env[key] = v;
}
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'worm-key-'));
  process.env.WORM_KEK = 'a'.repeat(32);
  delete process.env.NODE_ENV;
  delete process.env.DEMO_MODE;
  delete process.env.WORM_FILE_KEY;
});
afterAll(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  for (const k of Object.keys(ORIGINAL_ENV)) restoreEnv(k);
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

describe('P5-9 retire / purge 回收策略', () => {
  test('retire 后旧 key 仍可验签，新 seal 用新 active key', () => {
    const p = new DemoEphemeralKeyProvider();
    const k1 = p.activeKeyId();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sm2 = require('sm-crypto').sm2;
    const sig1 = sm2.doSignature('seg-old', p.getSigningKey().privateKeyHex);
    p.rotate();
    const k2 = p.activeKeyId();
    expect(k2).not.toBe(k1);
    // retire k1
    expect(p.retire(k1).ok).toBe(true);
    // 旧段仍可验签
    expect(p.verify('seg-old', sig1, k1).ok).toBe(true);
    // 新 active 不是 k1
    expect(p.activeKeyId()).not.toBe(k1);
  });

  test('purge active key → cannot-purge-active', () => {
    const p = new DemoEphemeralKeyProvider();
    const k = p.activeKeyId();
    const r = p.purge(k);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('cannot-purge-active');
  });

  test('purge 仍被引用的 key → key-in-use 附引用数', () => {
    const p = new DemoEphemeralKeyProvider();
    const k1 = p.activeKeyId();
    p.rotate();
    p.retire(k1);
    // 模拟 k1 被 3 段引用
    p.setKeyInUseChecker(() => 3);
    const r = p.purge(k1);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('key-in-use');
    expect(r.refs).toBe(3);
    // 之后清掉引用再 purge 成功
    p.setKeyInUseChecker(() => 0);
    const r2 = p.purge(k1);
    expect(r2.ok).toBe(true);
    expect(p.listKeyIds()).not.toContain(k1);
    // verify 未知 keyId
    expect(p.verify('x', '0'.repeat(128), k1).reason).toBe('unknown-key-id');
  });

  test('purge 不存在的 keyId → unknown-key-id', () => {
    const p = new DemoEphemeralKeyProvider();
    const r = p.purge('nonexistent');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('unknown-key-id');
  });

  test('purge 未挂 checker 时 → key-in-use-checker-not-wired（fail-closed）', () => {
    const p = new DemoEphemeralKeyProvider();
    p.rotate();
    const k1 = p.listKeyIds()[0];
    p.retire(k1);
    // 不调 setKeyInUseChecker → checker 为 null
    const r = p.purge(k1);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('key-in-use-checker-not-wired');
  });
});

describe('P5-12 EnvKeyProvider', () => {
  const ORIG_PRIV = process.env.WORM_SM2_PRIVATE_KEY;
  const ORIG_PUB = process.env.WORM_SM2_PUBLIC_KEY;
  afterAll(() => {
    if (ORIG_PRIV === undefined) delete process.env.WORM_SM2_PRIVATE_KEY; else process.env.WORM_SM2_PRIVATE_KEY = ORIG_PRIV;
    if (ORIG_PUB === undefined) delete process.env.WORM_SM2_PUBLIC_KEY; else process.env.WORM_SM2_PUBLIC_KEY = ORIG_PUB;
  });

  test('kind=env, productionSafe=true, signerKeyId 跨实例一致', () => {
    process.env.WORM_SM2_PRIVATE_KEY = 'a'.repeat(64);
    process.env.WORM_SM2_PUBLIC_KEY = '04' + 'b'.repeat(128);
    const p1 = new EnvKeyProvider();
    const p2 = new EnvKeyProvider();
    expect(p1.kind).toBe('env');
    expect(p1.productionSafe).toBe(true);
    expect(p1.activeKeyId()).toBe(p2.activeKeyId());
    expect(p1.activeKeyId()).toBe('k-' + 'b'.repeat(12));
  });

  test('另一实例 getPublicKey 能取到', () => {
    process.env.WORM_SM2_PRIVATE_KEY = 'a'.repeat(64);
    process.env.WORM_SM2_PUBLIC_KEY = '04' + 'b'.repeat(128);
    const p1 = new EnvKeyProvider();
    const p2 = new EnvKeyProvider();
    expect(p2.getPublicKey(p1.activeKeyId())).toBe('04' + 'b'.repeat(128));
  });

  test('只配私钥不配公钥 → 抛明确错误', () => {
    process.env.WORM_SM2_PRIVATE_KEY = 'a'.repeat(64);
    delete process.env.WORM_SM2_PUBLIC_KEY;
    expect(() => new EnvKeyProvider()).toThrow(/worm-env-key-invalid/);
  });

  test('不配 env → DemoEphemeralKeyProvider 仍每进程随机', () => {
    delete process.env.WORM_SM2_PRIVATE_KEY;
    delete process.env.WORM_SM2_PUBLIC_KEY;
    const p1 = new DemoEphemeralKeyProvider();
    const p2 = new DemoEphemeralKeyProvider();
    expect(p1.kind).toBe('demo-ephemeral');
    expect(p1.activeKeyId()).not.toBe(p2.activeKeyId());
  });
});

describe('P5-12 factory 路径 fail-closed（getKeyProvider）', () => {
  const ORIG: Record<string, string | undefined> = {};
  const keys = ['WORM_KEY_DIR','WORM_FILE_KEY','WORM_SM2_PRIVATE_KEY','WORM_SM2_PUBLIC_KEY','WORM_KEK','WORM_STORE_DIR','NODE_ENV'];
  beforeAll(() => {
    for (const k of keys) ORIG[k] = process.env[k];
  });
  afterAll(() => {
    for (const k of keys) {
      if (ORIG[k] === undefined) delete process.env[k]; else process.env[k] = ORIG[k];
    }
    __resetKeyProvider(null);
  });
  beforeEach(() => {
    for (const k of keys) delete process.env[k];
    __resetKeyProvider(null);
  });

  test('只配 WORM_SM2_PRIVATE_KEY → 抛 worm-env-key-invalid', () => {
    process.env.WORM_SM2_PRIVATE_KEY = 'a'.repeat(64);
    expect(() => getKeyProvider()).toThrow(/worm-env-key-invalid/);
  });
  test('只配 WORM_SM2_PUBLIC_KEY → 抛 worm-env-key-invalid', () => {
    process.env.WORM_SM2_PUBLIC_KEY = '04' + 'b'.repeat(128);
    expect(() => getKeyProvider()).toThrow(/worm-env-key-invalid/);
  });
  test('两个都配但私钥长度不对 → 抛 worm-env-key-invalid', () => {
    process.env.WORM_SM2_PRIVATE_KEY = 'a'.repeat(60);
    process.env.WORM_SM2_PUBLIC_KEY = '04' + 'b'.repeat(128);
    expect(() => getKeyProvider()).toThrow(/worm-env-key-invalid/);
  });
  test('两个都配但公钥不是 04 开头 → 抛 worm-env-key-invalid', () => {
    process.env.WORM_SM2_PRIVATE_KEY = 'a'.repeat(64);
    process.env.WORM_SM2_PUBLIC_KEY = '03' + 'b'.repeat(128);
    expect(() => getKeyProvider()).toThrow(/worm-env-key-invalid/);
  });
  test('配 WORM_KEY_DIR 但不配 WORM_KEK → 抛 worm-kek-not-configured', () => {
    process.env.WORM_KEY_DIR = './tmp-keys';
    expect(() => getKeyProvider()).toThrow(/worm-kek-not-configured/);
  });
  test('配 WORM_KEY_DIR + WORM_KEK → kind=file', () => {
    process.env.WORM_KEY_DIR = './tmp-keys';
    process.env.WORM_KEK = 'c'.repeat(32);
    const p = getKeyProvider();
    expect(p.kind).toBe('file');
  });
  test('都不配（非 production）→ kind=demo-ephemeral', () => {
    const p = getKeyProvider();
    expect(p.kind).toBe('demo-ephemeral');
  });
  test('NODE_ENV=production + 都不配 → 抛 not-configured-for-production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => getKeyProvider()).toThrow(/worm-key-provider-not-configured-for-production/);
  });
  test('两个 env 都合法配齐 → kind=env', () => {
    process.env.WORM_SM2_PRIVATE_KEY = 'a'.repeat(64);
    process.env.WORM_SM2_PUBLIC_KEY = '04' + 'b'.repeat(128);
    const p = getKeyProvider();
    expect(p.kind).toBe('env');
  });
});
