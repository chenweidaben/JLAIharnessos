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
export type PurgeError = 'unknown-key-id' | 'cannot-purge-active' | 'key-in-use' | 'key-in-use-checker-not-wired';

export interface VerifyOutcome { ok: boolean; reason?: KeyIdReason; }
export interface PurgeResult { ok: boolean; error?: PurgeError; refs?: number; }

export interface KeyProvider {
  readonly kind: 'file' | 'demo-ephemeral' | 'memory';
  readonly productionSafe: boolean;
  activeKeyId(): string;
  getSigningKey(): { keyId: string; privateKeyHex: string };
  getPublicKey(keyId: string): string | null;
  verify(digestHex: string, signatureHex: string, keyId?: string): VerifyOutcome;
  rotate(): { fromKeyId: string; toKeyId: string };
  listKeyIds(): string[];
  /** P5-9：标记 key 不可用于新签名，旧段仍可验签 */
  retire(keyId: string): { ok: boolean; error?: string };
  /** P5-9：彻底删除 key。若仍有段引用则拒绝（key-in-use） */
  purge(keyId: string): PurgeResult;
  /** 由外部注入"该 keyId 是否仍被段引用"的检查，用于 purge 护栏 */
  setKeyInUseChecker(fn: (keyId: string) => number): void;
}

interface RingEntry {
  keyId: string;
  publicKeyHex: string;
  encryptedPrivateKeyHex: string;
  ivHex: string;
  createdAt: string;
  active: boolean;
  retired?: boolean;
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
  kind: 'demo-ephemeral' | 'env' = 'demo-ephemeral';
  readonly productionSafe = false;
  private ring: Array<{ keyId: string; publicKeyHex: string; privateKeyHex: string; retired?: boolean }> = [];
  private activeKey = '';
  // P5-9：fail-closed——未注入 checker 时 purge 拒绝，不猜 refs=0
  private keyInUse: ((keyId: string) => number) | null = null;

  constructor() {
    // P5-12：恢复 env 密钥优先语义（P5-8 重构回归）
    const envPriv = process.env.WORM_SM2_PRIVATE_KEY ?? '';
    const envPub = process.env.WORM_SM2_PUBLIC_KEY ?? '';
    if (/^[0-9a-f]{64}$/i.test(envPriv) && /^04[0-9a-f]{128}$/i.test(envPub)) {
      // 从公钥稳定派生 keyId：'k-' + 公钥第 3-14 位（跨进程一致）
      const keyId = 'k-' + envPub.slice(2, 14);
      this.ring = [{ keyId, publicKeyHex: envPub, privateKeyHex: envPriv }];
      this.activeKey = keyId;
      this.kind = 'env';
      console.warn('[worm-key] env-configured SM2 key in use (keyId=' + keyId + ')');
    } else {
      const kp = newKeyPair();
      this.ring = [{ keyId: kp.keyId, publicKeyHex: kp.publicKeyHex, privateKeyHex: kp.privateKeyHex }];
      this.activeKey = kp.keyId;
      this.kind = 'demo-ephemeral';
      console.warn('[worm-key] demo-ephemeral provider in use — NOT FOR PRODUCTION');
    }
  }

  private byId(keyId: string) { return this.ring.find((r) => r.keyId === keyId); }
  private active() {
    const e = this.byId(this.activeKey);
    if (!e || e.retired) {
      // 自动选下一个未 retired 的
      const next = this.ring.find((r) => !r.retired);
      if (!next) throw new Error('worm-no-active-key');
      this.activeKey = next.keyId;
      return next;
    }
    return e;
  }

  activeKeyId(): string { return this.active().keyId; }
  getSigningKey(): { keyId: string; privateKeyHex: string } {
    const e = this.active();
    return { keyId: e.keyId, privateKeyHex: e.privateKeyHex };
  }
  getPublicKey(keyId: string): string | null {
    return this.byId(keyId)?.publicKeyHex ?? null;
  }
  verify(digestHex: string, signatureHex: string, keyId?: string): VerifyOutcome {
    const kid = keyId || this.activeKeyId();
    const e = this.byId(kid);
    if (!e) return { ok: false, reason: 'unknown-key-id' };
    try {
      const ok = sm2.doVerifySignature(digestHex, signatureHex, e.publicKeyHex);
      return ok ? { ok: true } : { ok: false, reason: 'bad-signature' };
    } catch { return { ok: false, reason: 'bad-signature' }; }
  }
  rotate(): { fromKeyId: string; toKeyId: string } {
    const from = this.activeKeyId();
    const kp = newKeyPair();
    this.ring.push({ keyId: kp.keyId, publicKeyHex: kp.publicKeyHex, privateKeyHex: kp.privateKeyHex });
    this.activeKey = kp.keyId;
    return { fromKeyId: from, toKeyId: kp.keyId };
  }
  listKeyIds(): string[] { return this.ring.map((r) => r.keyId); }
  setKeyInUseChecker(fn: (keyId: string) => number): void { this.keyInUse = fn; }

  retire(keyId: string): { ok: boolean; error?: string } {
    const e = this.byId(keyId);
    if (!e) return { ok: false, error: 'unknown-key-id' };
    e.retired = true;
    return { ok: true };
  }
  purge(keyId: string): PurgeResult {
    const e = this.byId(keyId);
    if (!e) return { ok: false, error: 'unknown-key-id' };
    if (this.activeKeyId() === keyId) return { ok: false, error: 'cannot-purge-active' };
    if (!this.keyInUse) return { ok: false, error: 'key-in-use-checker-not-wired' };
    const refs = this.keyInUse(keyId);
    if (refs > 0) return { ok: false, error: 'key-in-use', refs };
    this.ring = this.ring.filter((r) => r.keyId !== keyId);
    return { ok: true };
  }
}

/* -------------------- FileKeyProvider -------------------- */

export class FileKeyProvider implements KeyProvider {
  readonly kind = 'file' as const;
  readonly productionSafe = true;
  private ring: RingEntry[] = [];
  private ringPath: string;
  private kek: string;
  private privateCache = new Map<string, string>();
  // P5-9：fail-closed——未注入 checker 时 purge 拒绝
  private keyInUse: ((keyId: string) => number) | null = null;

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
    let a = this.ring.find((r) => r.active && !r.retired);
    if (!a) {
      // 当前 active 已被 retire，自动切到下一个未 retired 的
      a = this.ring.find((r) => !r.retired);
      if (!a) throw new Error('worm-no-active-key');
      for (const r of this.ring) r.active = false;
      a.active = true;
      this.persist();
    }
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

  setKeyInUseChecker(fn: (keyId: string) => number): void { this.keyInUse = fn; }

  retire(keyId: string): { ok: boolean; error?: string } {
    const e = this.ring.find((r) => r.keyId === keyId);
    if (!e) return { ok: false, error: 'unknown-key-id' };
    e.retired = true;
    this.persist();
    return { ok: true };
  }

  purge(keyId: string): PurgeResult {
    const e = this.ring.find((r) => r.keyId === keyId);
    if (!e) return { ok: false, error: 'unknown-key-id' };
    if (this.activeKeyId() === keyId) return { ok: false, error: 'cannot-purge-active' };
    if (!this.keyInUse) return { ok: false, error: 'key-in-use-checker-not-wired' };
    const refs = this.keyInUse(keyId);
    if (refs > 0) return { ok: false, error: 'key-in-use', refs };
    this.ring = this.ring.filter((r) => r.keyId !== keyId);
    this.privateCache.delete(keyId);
    this.persist();
    return { ok: true };
  }
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
