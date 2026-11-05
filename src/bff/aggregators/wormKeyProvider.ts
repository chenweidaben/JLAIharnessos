/**
 * 健澜AI原生医院操作系统OS - P5-8 WORM SM2 密钥提供方抽象 + 轮换
 *
 * - DemoEphemeralKeyProvider：进程内生成，productionSafe=false，显式 warn
 * - FileKeyProvider：密钥环持久化到 <WORM_STORE_DIR>/_keys.json，
 *   私钥用 SM4-CBC 加密落盘（KEK 只认 WORM_KEK，缺失即拒绝构造，绝不回落
 *   内容密钥 WORM_SM4_KEY），绝不明文
 * - 按段 signerKeyId 选公钥验签，未知 keyId → unknown-key-id（与篡改区分）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const smCrypto = require('sm-crypto');
const { sm2, sm4 } = smCrypto as {
  sm2: { generateKeyPairHex: () => { publicKey: string; privateKey: string }; doSignature: (m: string, p: string) => string; doVerifySignature: (m: string, s: string, pub: string) => boolean };
  sm4: { encrypt: (p: string, k: string, o: { mode: string; iv: string }) => string; decrypt: (c: string, k: string, o: { mode: string; iv: string }) => string };
};

export type KeyIdReason = 'unknown-key-id' | 'bad-signature';

export interface VerifyOutcome { ok: boolean; reason?: KeyIdReason; }

export interface KeyProvider {
  readonly kind: 'file' | 'demo-ephemeral' | 'memory';
  readonly productionSafe: boolean;
  activeKeyId(): string;
  getSigningKey(): { keyId: string; privateKeyHex: string };
  getPublicKey(keyId: string): string | null;
  verify(digestHex: string, signatureHex: string, keyId?: string): VerifyOutcome;
  rotate(): { fromKeyId: string; toKeyId: string };
  listKeyIds(): string[];
}

interface RingEntry {
  keyId: string;
  publicKeyHex: string;
  encryptedPrivateKeyHex: string;
  ivHex: string;
  createdAt: string;
  active: boolean;
}

function newKeyPair(): { keyId: string; publicKeyHex: string; privateKeyHex: string } {
  const kp = sm2.generateKeyPairHex();
  const keyId = `k-${kp.publicKey.slice(0, 12)}`;
  return { keyId, publicKeyHex: kp.publicKey, privateKeyHex: kp.privateKey };
}

function kekFromEnv(): string {
  // 硬边界：KEK 必须独立配置，不回落 WORM_SM4_KEY。
  // 原因：内容加密密钥(WORM_SM4_KEY)与 KEK(加密 SM2 私钥环)用途不同，
  // 同钥多用途会扩大 CBC 攻击面，且内容密钥泄露等于私钥环泄露。
  const kek = process.env.WORM_KEK || '';
  if (!/^[0-9a-fA-F]{32}$/.test(kek)) return '';
  return kek.toLowerCase();
}

/* -------------------- DemoEphemeral -------------------- */

export class DemoEphemeralKeyProvider implements KeyProvider {
  readonly kind = 'demo-ephemeral' as const;
  readonly productionSafe = false;
  private ring: Array<{ keyId: string; publicKeyHex: string; privateKeyHex: string }> = [];
  private activeKey = '';

  constructor() {
    const kp = newKeyPair();
    this.ring = [{ keyId: kp.keyId, publicKeyHex: kp.publicKeyHex, privateKeyHex: kp.privateKeyHex }];
    this.activeKey = kp.keyId;
    console.warn('[worm-key] demo-ephemeral provider in use — NOT FOR PRODUCTION');
  }

  private byId(keyId: string) { return this.ring.find((r) => r.keyId === keyId); }
  private active() {
    const e = this.byId(this.activeKey);
    if (!e) throw new Error('worm-demo-key-ring-empty');
    return e;
  }

  activeKeyId(): string { return this.activeKey; }
  getSigningKey(): { keyId: string; privateKeyHex: string } {
    const e = this.active();
    return { keyId: e.keyId, privateKeyHex: e.privateKeyHex };
  }
  getPublicKey(keyId: string): string | null {
    return this.byId(keyId)?.publicKeyHex ?? null;
  }
  verify(digestHex: string, signatureHex: string, keyId?: string): VerifyOutcome {
    const kid = keyId || this.activeKey;
    const e = this.byId(kid);
    if (!e) return { ok: false, reason: 'unknown-key-id' };
    try {
      const ok = sm2.doVerifySignature(digestHex, signatureHex, e.publicKeyHex);
      return ok ? { ok: true } : { ok: false, reason: 'bad-signature' };
    } catch { return { ok: false, reason: 'bad-signature' }; }
  }
  rotate(): { fromKeyId: string; toKeyId: string } {
    const from = this.activeKey;
    const kp = newKeyPair();
    this.ring.push({ keyId: kp.keyId, publicKeyHex: kp.publicKeyHex, privateKeyHex: kp.privateKeyHex });
    this.activeKey = kp.keyId;
    return { fromKeyId: from, toKeyId: kp.keyId };
  }
  listKeyIds(): string[] { return this.ring.map((r) => r.keyId); }
}

/* -------------------- FileKeyProvider -------------------- */

export class FileKeyProvider implements KeyProvider {
  readonly kind = 'file' as const;
  readonly productionSafe = true;
  private ring: RingEntry[] = [];
  private ringPath: string;
  private kek: string;
  // 内存中解密后的私钥缓存（避免每次签都解一次）
  private privateCache = new Map<string, string>();

  constructor(storeDir: string) {
    this.ringPath = join(storeDir, '_keys.json');
    this.kek = kekFromEnv();
    if (!this.kek) throw new Error('worm-kek-not-configured');
    mkdirSync(storeDir, { recursive: true });
    if (existsSync(this.ringPath)) {
      try {
        this.ring = JSON.parse(readFileSync(this.ringPath, 'utf8')).ring as RingEntry[];
      } catch { this.ring = []; }
    }
    if (this.ring.length === 0) {
      const kp = newKeyPair();
      const iv = randomBytes(16).toString('hex');
      const enc = sm4.encrypt(kp.privateKeyHex, this.kek, { mode: 'cbc', iv });
      this.ring = [{
        keyId: kp.keyId, publicKeyHex: kp.publicKeyHex,
        encryptedPrivateKeyHex: enc, ivHex: iv, createdAt: new Date().toISOString(), active: true,
      }];
      this.privateCache.set(kp.keyId, kp.privateKeyHex);
      this.persist();
    }
  }

  private persist(): void {
    // 私钥加密后落盘，绝不明文
    writeFileSync(this.ringPath, JSON.stringify({ ring: this.ring }, null, 2), 'utf8');
  }

  private activeEntry(): RingEntry {
    const a = this.ring.find((r) => r.active);
    if (!a) throw new Error('worm-key-ring-corrupt');
    return a;
  }

  activeKeyId(): string { return this.activeEntry().keyId; }

  getSigningKey(): { keyId: string; privateKeyHex: string } {
    const e = this.activeEntry();
    if (!this.privateCache.has(e.keyId)) {
      const priv = sm4.decrypt(e.encryptedPrivateKeyHex, this.kek, { mode: 'cbc', iv: e.ivHex });
      this.privateCache.set(e.keyId, priv);
    }
    return { keyId: e.keyId, privateKeyHex: this.privateCache.get(e.keyId)! };
  }

  getPublicKey(keyId: string): string | null {
    return this.ring.find((r) => r.keyId === keyId)?.publicKeyHex ?? null;
  }

  verify(digestHex: string, signatureHex: string, keyId?: string): VerifyOutcome {
    const kid = keyId || this.activeKeyId();
    const pub = this.getPublicKey(kid);
    if (!pub) return { ok: false, reason: 'unknown-key-id' };
    try {
      const ok = sm2.doVerifySignature(digestHex, signatureHex, pub);
      return ok ? { ok: true } : { ok: false, reason: 'bad-signature' };
    } catch { return { ok: false, reason: 'bad-signature' }; }
  }

  rotate(): { fromKeyId: string; toKeyId: string } {
    const from = this.activeKeyId();
    const kp = newKeyPair();
    const iv = randomBytes(16).toString('hex');
    const enc = sm4.encrypt(kp.privateKeyHex, this.kek, { mode: 'cbc', iv });
    for (const r of this.ring) r.active = false;
    this.ring.push({
      keyId: kp.keyId, publicKeyHex: kp.publicKeyHex,
      encryptedPrivateKeyHex: enc, ivHex: iv, createdAt: new Date().toISOString(), active: true,
    });
    this.privateCache.set(kp.keyId, kp.privateKeyHex);
    this.persist();
    return { fromKeyId: from, toKeyId: kp.keyId };
  }

  listKeyIds(): string[] { return this.ring.map((r) => r.keyId); }

  ringFilePath(): string { return this.ringPath; }
}

/* -------------------- 工厂 -------------------- */

let globalProvider: KeyProvider | null = null;

export function getKeyProvider(): KeyProvider {
  if (globalProvider) return globalProvider;
  const storeDir = process.env.WORM_STORE_DIR || join(process.cwd(), 'logs', 'worm-store');
  // KEK 独立配置；缺失时一律走 demo-ephemeral（显式 warn），不静默降级
  if (kekFromEnv() && (process.env.NODE_ENV === 'production' || process.env.WORM_FILE_KEY === '1')) {
    globalProvider = new FileKeyProvider(storeDir);
  } else {
    globalProvider = new DemoEphemeralKeyProvider();
  }
  return globalProvider;
}

/** 测试与巡检：强制重置 provider（每次单测后调用）。 */
export function __resetKeyProvider(p: KeyProvider | null = null): void {
  globalProvider = p;
}
