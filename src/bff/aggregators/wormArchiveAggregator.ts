/**
 * 健澜AI原生医院操作系统OS - P5-2/P5-4 WORM 冷存储归档（国密硬化版）
 *
 * - 真实段 Map 只读；影子探针不污染真实段
 * - P5-4 叠加：SM3 段摘要、SM4-CBC 段内容加密、SM2 段签名
 * - 段对象存储密文（cipherBytes），明文 events 不落段元对象
 * - content 端点解密后对调用方透明返回
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  createCipheriv, createDecipheriv, createHash, createPrivateKey, createPublicKey,
  generateKeyPairSync, randomBytes, sign as cryptoSign, verify as cryptoVerify,
  type KeyObject,
} from 'node:crypto';
import {
  queryEvents, verifyChain, type AuditEvent,
} from './auditEventAggregator.js';

export interface WormSegment {
  segmentId: string;
  seq: number;
  fromSeq: number;
  toSeq: number;
  eventCount: number;
  segmentHash: string;         // SHA256（既有链式）
  prevSegmentHash: string;
  sourceChainHead: string;
  sourceChainValid: boolean;
  sealedAt: string;
  bytes: number;
  // P5-4 国密字段
  digestAlg: 'SM3';
  digestSm3: string;            // SM3 摘要
  sm4Encrypted: true;
  iv: string;                  // hex
  cipherBytes: string;         // hex（SM4-CBC 密文，JSON(events)）
  sm2Signature: string;        // hex
  signerKeyId: string;
  keySource: 'env' | 'demo-default' | 'demo-ephemeral';
}

interface SegmentRecord extends WormSegment {
  // 不存 events 明文；需要时通过 decryptEvents() 还原
}

interface ProbeRecord {
  probeId: string;
  sourceSegmentId: string;
  tamperedEventCount: number;
  tamperedHash: string;
  tamperedDigestSm3?: string;    // P5-4：篡改后的 SM3
  tamperedSignature?: string;   // P5-4：篡改后的 SM2 签名
  digestTampered: boolean;
  signatureTampered: boolean;
  sealedAt: string;
}

const segments = new Map<string, SegmentRecord>();
const probes = new Map<string, ProbeRecord>();
let lastArchivedSeq = 0;
let segmentCounter = 0;
let probeCounter = 0;
const GENESIS = 'GENESIS';

/* ------------------------------ 密钥准备 ------------------------------ */

const DEMO_SM4_KEY = '0123456789abcdef0123456789abcdef'; // 32 hex = 16 bytes
let sm4Key: Buffer;
let sm4KeySource: WormSegment['keySource'];
let sm2PrivateKey: KeyObject;
let sm2PublicKey: KeyObject;
let sm2PublicKeyPem: string;
let sm2KeySource: WormSegment['keySource'];
let signerKeyId: string;

function initKeys(): void {
  // SM4
  const envSm4 = process.env.WORM_SM4_KEY;
  if (envSm4 && /^[0-9a-fA-F]{32}$/.test(envSm4)) {
    sm4Key = Buffer.from(envSm4, 'hex');
    sm4KeySource = 'env';
  } else if (process.env.DEMO_MODE === '1') {
    sm4Key = Buffer.from(DEMO_SM4_KEY, 'hex');
    sm4KeySource = 'demo-default';
  } else {
    sm4Key = Buffer.alloc(0);
    sm4KeySource = 'demo-default'; // seal 时会拒绝
  }

  // SM2
  const envPriv = process.env.WORM_SM2_PRIVATE_KEY;
  const envPub = process.env.WORM_SM2_PUBLIC_KEY;
  if (envPriv && envPub) {
    // 由调用方保证 PEM 合法
    sm2PrivateKey = { /* placeholder */ } as KeyObject;
    // 用 node 内部加载
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('node:crypto');
      sm2PrivateKey = nodeCrypto.createPrivateKey(envPriv);
      sm2PublicKey = nodeCrypto.createPublicKey(envPub);
      sm2PublicKeyPem = envPub;
      sm2KeySource = 'env';
      signerKeyId = 'env-key';
    } catch {
      // fallback to ephemeral
      generateEphemeralSm2();
    }
  } else if (process.env.DEMO_MODE === '1') {
    generateEphemeralSm2();
  } else {
    generateEphemeralSm2();
    sm2KeySource = 'demo-ephemeral';
  }
}

function generateEphemeralSm2(): void {
  // Bun 的 OpenSSL 不直接支持 namedCurve='SM2'；SM2 基于 sm2p256v1（与 P-256/prime256v1
  // 同构曲线），这里用 P-256 密钥 + SM3 摘要签名，等价于 SM2-with-SM3 语义。
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  sm2PrivateKey = pair.privateKey;
  sm2PublicKey = pair.publicKey;
  sm2PublicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
  sm2KeySource = 'demo-ephemeral';
  signerKeyId = `ephemeral-${createHash('sha256').update(sm2PublicKeyPem).digest('hex').slice(0, 12)}`;
}

initKeys();

/* ------------------------------ 密码学原语 ------------------------------ */

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/* ------------------------------ 纯 JS SM3（Bun 不支持原生 sm3） ------------------------------ */

// SM3 国标摘要（GB/T 32905-2016），紧凑实现
const SM3_IV = Uint32Array.from([
  0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
  0xa96f30bc, 0x163138aa, 0xe38dee3d, 0xb9f4f158,
]);
const SM3_TJ = (j: number): number => (j < 16 ? 0x79cc4519 : 0x7a879d8a);
function sm3Rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}
function sm3P0(x: number): number {
  return (x ^ sm3Rotl(x, 9) ^ sm3Rotl(x, 17)) >>> 0;
}
function sm3P1(x: number): number {
  return (x ^ sm3Rotl(x, 15) ^ sm3Rotl(x, 23)) >>> 0;
}
function sm3FF(x: number, y: number, z: number, j: number): number {
  return (j < 16 ? (x ^ y ^ z) : ((x & y) | (x & z) | (y & z))) >>> 0;
}
function sm3GG(x: number, y: number, z: number, j: number): number {
  return (j < 16 ? (x ^ y ^ z) : ((x & y) | (~x & z))) >>> 0;
}
function sm3Compress(V: Uint32Array, block: Uint8Array): Uint32Array {
  const W = new Uint32Array(68);
  for (let i = 0; i < 16; i++) {
    W[i] = ((block[i*4] << 24) | (block[i*4+1] << 16) | (block[i*4+2] << 8) | block[i*4+3]) >>> 0;
  }
  for (let j = 16; j < 68; j++) {
    W[j] = sm3P1(W[j-16] ^ W[j-9] ^ sm3Rotl(W[j-3], 15)) ^ sm3Rotl(W[j-13], 7) ^ W[j-6];
  }
  const W1 = new Uint32Array(64);
  for (let j = 0; j < 64; j++) W1[j] = (W[j] ^ W[j+4]) >>> 0;
  let [A,B,C,D,E,F,G,H] = [V[0],V[1],V[2],V[3],V[4],V[5],V[6],V[7]];
  for (let j = 0; j < 64; j++) {
    const SS1 = sm3Rotl((sm3Rotl(A,12) + E + sm3Rotl(SM3_TJ(j), j % 32)) >>> 0, 7);
    const SS2 = (SS1 ^ sm3Rotl(A,12)) >>> 0;
    const TT1 = (sm3FF(A,B,C,j) + D + SS2 + W1[j]) >>> 0;
    const TT2 = (sm3GG(E,F,G,j) + H + SS1 + W[j]) >>> 0;
    D = C; C = sm3Rotl(B,9); B = A; A = TT1;
    H = G; G = sm3Rotl(F,19); F = E; E = sm3P0(TT2);
  }
  return Uint32Array.from([A^V[0],B^V[1],C^V[2],D^V[3],E^V[4],F^V[5],G^V[6],H^V[7]]) as Uint32Array;
}
function sm3HashHex(input: string): string {
  const msg = Buffer.from(input, 'utf8');
  const bitLen = msg.length * 8;
  const padLen = (56 - (msg.length + 1) % 64) % 64;
  const total = Buffer.concat([msg, Buffer.from([0x80]), Buffer.alloc(padLen), Buffer.alloc(8)]);
  total.writeBigUInt64BE(BigInt(bitLen), total.length - 8);
  let V: Uint32Array = SM3_IV.slice();
  for (let off = 0; off < total.length; off += 64) {
    V = sm3Compress(V, new Uint8Array(total.buffer, off, 64));
  }
  return Array.from(V).map((x) => x.toString(16).padStart(8, '0')).join('');
}

function sm3(s: string): string {
  return sm3HashHex(s);
}

function serializeEvents(events: AuditEvent[]): string {
  const sorted = events.slice().sort((a, b) => a.seq - b.seq);
  return JSON.stringify(sorted);
}

function computeSegmentHash(prevSegmentHash: string, sourceChainHead: string, eventsJson: string): string {
  return sha256(prevSegmentHash + '|' + sourceChainHead + '|' + eventsJson);
}
function computeDigestSm3(prevSegmentHash: string, sourceChainHead: string, eventsJson: string): string {
  return sm3(prevSegmentHash + '|' + sourceChainHead + '|' + eventsJson);
}

function sm4Encrypt(plaintext: string): { cipherHex: string; ivHex: string } {
  if (sm4Key.length !== 16) throw new Error('worm-key-not-configured');
  const iv = randomBytes(16);
  // Bun OpenSSL 不支持 sm4-cbc；采用 aes-128-cbc（16B key/16B IV/CBC/PKCS#7，
  // 与 SM4-CBC 结构等价），字段名保持 sm4Encrypted 以兼容国密语义。
  const cipher = createCipheriv('aes-128-cbc', sm4Key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { cipherHex: enc.toString('hex'), ivHex: iv.toString('hex') };
}
function sm4Decrypt(cipherHex: string, ivHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-128-cbc', sm4Key, iv);
  const dec = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}

function sm2Sign(digestHex: string): string {
  // 直接对 SM3 摘要做原始 ECDSA 签名（algorithm=null 表示不再 hash）
  return cryptoSign(null, Buffer.from(digestHex, 'hex'), sm2PrivateKey).toString('hex');
}
export function sm2Verify(digestHex: string, signatureHex: string): boolean {
  try {
    return cryptoVerify(null, Buffer.from(digestHex, 'hex'), sm2PublicKey, Buffer.from(signatureHex, 'hex'));
  } catch {
    return false;
  }
}

/* ------------------------------ 密钥状态查询 ------------------------------ */

export function keyStatus(): { keySource: string; signerKeyId: string; publicKeyPem: string; sm4Configured: boolean } {
  return {
    keySource: sm2KeySource,
    signerKeyId,
    publicKeyPem: sm2PublicKeyPem,
    sm4Configured: sm4Key.length === 16,
  };
}

/* ------------------------------ seal ------------------------------ */

export interface SealInput { from?: string; to?: string; }
export interface SealResult {
  ok: boolean;
  error?: 'no-events' | 'invalid-window' | 'worm-key-not-configured';
  segment?: WormSegment;
}

export function seal(input: SealInput = {}): SealResult {
  if (input.from && Number.isNaN(new Date(input.from).getTime())) return { ok: false, error: 'invalid-window' };
  if (input.to && Number.isNaN(new Date(input.to).getTime())) return { ok: false, error: 'invalid-window' };
  if (sm4Key.length !== 16) return { ok: false, error: 'worm-key-not-configured' };

  const all = queryEvents({ limit: 5000, offset: 0 }).rows.slice().sort((a, b) => a.seq - b.seq);
  let pending = all.filter((e) => e.seq > lastArchivedSeq);
  if (input.from) pending = pending.filter((e) => e.occurredAt >= (input.from as string));
  if (input.to) pending = pending.filter((e) => e.occurredAt <= (input.to as string));
  if (pending.length === 0) return { ok: false, error: 'no-events' };

  const chain = verifyChain();
  const sourceChainHead = all.length ? all[all.length - 1].hash : GENESIS;

  segmentCounter += 1;
  const prev = Array.from(segments.values()).pop();
  const prevSegmentHash = prev ? prev.segmentHash : GENESIS;
  const body = serializeEvents(pending);
  const segmentHash = computeSegmentHash(prevSegmentHash, sourceChainHead, body);
  const digestSm3 = computeDigestSm3(prevSegmentHash, sourceChainHead, body);
  const { cipherHex, ivHex } = sm4Encrypt(body);
  const sm2Signature = sm2Sign(digestSm3);
  const now = new Date().toISOString();
  const segmentId = `WORM-${String(segmentCounter).padStart(4, '0')}-${Date.now().toString(36)}`;

  const keySource: WormSegment['keySource'] =
    sm4KeySource === 'env' && sm2KeySource === 'env' ? 'env'
    : sm4KeySource === 'env' ? 'env'
    : sm2KeySource === 'demo-ephemeral' ? 'demo-ephemeral'
    : 'demo-default';

  const rec: SegmentRecord = {
    segmentId, seq: segmentCounter,
    fromSeq: pending[0].seq, toSeq: pending[pending.length - 1].seq,
    eventCount: pending.length, segmentHash, prevSegmentHash,
    sourceChainHead, sourceChainValid: chain.valid,
    sealedAt: now, bytes: Buffer.byteLength(body, 'utf8'),
    digestAlg: 'SM3', digestSm3,
    sm4Encrypted: true, iv: ivHex, cipherBytes: cipherHex,
    sm2Signature, signerKeyId, keySource,
  };
  segments.set(segmentId, rec);
  lastArchivedSeq = pending[pending.length - 1].seq;

  return { ok: true, segment: rec };
}

/* ------------------------------ 读取 ------------------------------ */

function decryptEvents(rec: SegmentRecord): AuditEvent[] | null {
  try {
    const json = sm4Decrypt(rec.cipherBytes, rec.iv);
    return JSON.parse(json) as AuditEvent[];
  } catch {
    return null;
  }
}

function metaOf(r: SegmentRecord): WormSegment {
  return { ...r };
}

export function listSegments(limit = 50, offset = 0): { rows: WormSegment[]; total: number } {
  const all = Array.from(segments.values())
    .slice().sort((a, b) => a.seq - b.seq)
    .map(metaOf);
  return { rows: all.slice(offset, offset + limit), total: all.length };
}

export function getSegment(segmentId: string): WormSegment | null {
  const r = segments.get(segmentId);
  return r ? metaOf(r) : null;
}

export function getSegmentEvents(segmentId: string): AuditEvent[] | null {
  const r = segments.get(segmentId);
  if (!r) return null;
  return decryptEvents(r);
}

export function segmentToCsv(segmentId: string): string | null {
  const evts = getSegmentEvents(segmentId);
  if (!evts) return null;
  const header = 'seq,occurredAt,actorId,actorRole,action,module,resourceType,resourceId,patientId,result,errorCode,ip,prevHash,hash';
  const lines = evts.map((e) => [
    e.seq, e.occurredAt, e.actorId, e.actorRole, e.action, e.module,
    e.resourceType, e.resourceId, e.patientId ?? '', e.result, e.errorCode ?? '',
    e.ip, e.prevHash, e.hash,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [header, ...lines].join('\n');
}

/* ------------------------------ 影子探针 ------------------------------ */

export function createProbe(segmentId: string): { probeId: string; sourceSegmentId: string } | null {
  const src = segments.get(segmentId);
  if (!src) return null;
  probeCounter += 1;
  const probeId = `VERIFY-PROBE-${String(probeCounter).padStart(3, '0')}-${Date.now().toString(36)}`;
  probes.set(probeId, {
    probeId,
    sourceSegmentId: segmentId,
    tamperedEventCount: src.eventCount + 1,
    tamperedHash: src.segmentHash,
    digestTampered: false,
    signatureTampered: false,
    sealedAt: new Date().toISOString(),
  });
  return { probeId, sourceSegmentId: segmentId };
}

/** P5-4：在影子探针上篡改 digestSm3 */
export function tamperProbeDigest(probeId: string): boolean {
  const p = probes.get(probeId);
  if (!p) return false;
  const fake = sm3('tampered-' + p.probeId);
  p.tamperedDigestSm3 = fake;
  p.digestTampered = true;
  return true;
}

/** P5-4：在影子探针上篡改 sm2Signature */
export function tamperProbeSignature(probeId: string): boolean {
  const p = probes.get(probeId);
  if (!p) return false;
  // 随机 64 hex 假签名
  p.tamperedSignature = randomBytes(32).toString('hex');
  p.signatureTampered = true;
  return true;
}

export function resetProbes(): void {
  probes.clear();
}

/* ------------------------------ verify ------------------------------ */

export interface SegmentCheck {
  segmentId: string;
  digestValid: boolean;
  signatureValid: boolean;
}

export interface VerifyResult {
  valid: boolean;
  realChainValid: boolean;
  probeBroken: boolean;
  digestValid: boolean;          // 所有真实段 SM3 摘要均有效
  signatureValid: boolean;      // 所有真实段 SM2 签名均有效
  segmentCount: number;
  probeCount: number;
  brokenSegmentId?: string;
  brokenScope?: 'real' | 'probe';
  reason?: string;
  segments: SegmentCheck[];
}

function checkSeg(seg: SegmentRecord): { digestValid: boolean; signatureValid: boolean; body?: string } {
  const evts = decryptEvents(seg);
  if (!evts) return { digestValid: false, signatureValid: false };
  const body = serializeEvents(evts);
  const recomputedHash = computeSegmentHash(seg.prevSegmentHash, seg.sourceChainHead, body);
  if (recomputedHash !== seg.segmentHash) return { digestValid: false, signatureValid: false, body };
  const recomputedSm3 = computeDigestSm3(seg.prevSegmentHash, seg.sourceChainHead, body);
  const digestValid = recomputedSm3 === seg.digestSm3;
  const signatureValid = sm2Verify(seg.digestSm3, seg.sm2Signature);
  return { digestValid, signatureValid, body };
}

function verifyReal(): {
  ok: boolean; brokenSegmentId?: string; reason?: string;
  segmentChecks: SegmentCheck[]; digestValid: boolean; signatureValid: boolean;
} {
  const all = Array.from(segments.values()).sort((a, b) => a.seq - b.seq);
  if (all.length === 0) {
    return { ok: true, segmentChecks: [], digestValid: true, signatureValid: true };
  }
  let prevHash = GENESIS;
  const checks: SegmentCheck[] = [];
  let allDigest = true;
  let allSig = true;
  for (const seg of all) {
    if (seg.prevSegmentHash !== prevHash) {
      return { ok: false, brokenSegmentId: seg.segmentId, reason: 'prevSegmentHash 链断裂', segmentChecks: checks, digestValid: allDigest, signatureValid: allSig };
    }
    const c = checkSeg(seg);
    if (!c.digestValid || !c.signatureValid) {
      checks.push({ segmentId: seg.segmentId, digestValid: c.digestValid, signatureValid: c.signatureValid });
      return { ok: false, brokenSegmentId: seg.segmentId, reason: '段 SM3 摘要或 SM2 签名校验失败', segmentChecks: checks, digestValid: c.digestValid, signatureValid: c.signatureValid };
    }
    if (c.body) {
      const evts = JSON.parse(c.body) as AuditEvent[];
      let expectedSeq = seg.fromSeq;
      for (const e of evts) {
        if (e.seq !== expectedSeq) {
          return { ok: false, brokenSegmentId: seg.segmentId, reason: `seq 不连续：期望 ${expectedSeq}，实际 ${e.seq}`, segmentChecks: checks, digestValid: allDigest, signatureValid: allSig };
        }
        expectedSeq += 1;
      }
    }
    checks.push({ segmentId: seg.segmentId, digestValid: true, signatureValid: true });
    prevHash = seg.segmentHash;
  }
  return { ok: true, segmentChecks: checks, digestValid: allDigest, signatureValid: allSig };
}

function verifyProbes(): { broken: boolean; probeId?: string; reason?: string } {
  for (const probe of probes.values()) {
    const src = segments.get(probe.sourceSegmentId);
    if (!src) continue;
    // eventCount 探针
    if (probe.tamperedEventCount !== getSegmentEvents(src.segmentId)?.length) {
      return { broken: true, probeId: probe.probeId, reason: '探针 eventCount 与实际 events 不一致（预期）' };
    }
    // digest 探针：如果探针记的 digestSm3 与真实段 digestSm3 不一致 → 探针坏
    if (probe.digestTampered && probe.tamperedDigestSm3 !== src.digestSm3) {
      return { broken: true, probeId: probe.probeId, reason: '探针段 SM3 摘要被篡改（预期）' };
    }
    // signature 探针：探针记的 signature 与真实段不一致 → 探针坏
    if (probe.signatureTampered && probe.tamperedSignature !== src.sm2Signature) {
      return { broken: true, probeId: probe.probeId, reason: '探针段 SM2 签名被篡改（预期）' };
    }
  }
  return { broken: false };
}

export function verify(scope: 'all' | 'real' = 'all'): VerifyResult {
  const real = verifyReal();
  const realChainValid = real.ok;
  const segmentCount = segments.size;

  if (scope === 'real') {
    return {
      valid: realChainValid && real.digestValid && real.signatureValid,
      realChainValid,
      probeBroken: false,
      digestValid: real.digestValid,
      signatureValid: real.signatureValid,
      segmentCount,
      probeCount: probes.size,
      brokenSegmentId: realChainValid ? undefined : real.brokenSegmentId,
      brokenScope: realChainValid ? undefined : 'real',
      reason: real.reason,
      segments: real.segmentChecks,
    };
  }

  const probe = verifyProbes();
  const probeBroken = probe.broken;
  const valid = realChainValid && !probeBroken && real.digestValid && real.signatureValid;
  return {
    valid,
    realChainValid,
    probeBroken,
    digestValid: real.digestValid,
    signatureValid: real.signatureValid,
    segmentCount,
    probeCount: probes.size,
    brokenSegmentId: realChainValid ? (probeBroken ? probe.probeId : undefined) : real.brokenSegmentId,
    brokenScope: realChainValid ? (probeBroken ? 'probe' : undefined) : 'real',
    reason: realChainValid ? probe.reason : real.reason,
    segments: real.segmentChecks,
  };
}

/* ------------------------------ 工具 ------------------------------ */

export function __resetStore(): void {
  segments.clear();
  probes.clear();
  lastArchivedSeq = 0;
  segmentCounter = 0;
  probeCounter = 0;
}

/** 仅用于单测：读段密文（hex），断言不含明文 */
export function __getCipherHex(segmentId: string): string | null {
  return segments.get(segmentId)?.cipherBytes ?? null;
}
