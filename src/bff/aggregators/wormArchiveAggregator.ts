/**
 * 健澜AI原生医院操作系统OS - P5-2/P5-4 WORM 冷存储归档（真国密硬化版）
 *
 * - 真实段 Map 只读；影子探针不污染真实段
 * - P5-4：SM3 段摘要、SM4-CBC 段内容加密、SM2 段签名
 *   （全部由 sm-crypto@0.5.8 提供，国标算法真实现）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash, randomBytes } from 'node:crypto';
import {
  getPendingEvents, verifyChainSync, __sealDisabled, type AuditEvent,
} from './auditEventAggregator.js';
import { getWormBackendInfo, getWormStore, isValidSegmentId, toAsyncStore, type AsyncWormStore, type WormStore } from './wormStore.js';
import { getKeyProvider } from './wormKeyProvider.js';

// sm-crypto 真国密（无 @types，用 createRequire + 本地类型声明）
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const smCrypto = require('sm-crypto') as {
  sm3: (msg: string) => string;
  sm4: {
    encrypt: (plain: string, key: string, opts: { mode: string; iv: string }) => string;
    decrypt: (cipher: string, key: string, opts: { mode: string; iv: string }) => string;
  };
  sm2: {
    generateKeyPairHex: () => { publicKey: string; privateKey: string };
    doSignature: (msg: string, privateKey: string) => string;
    doVerifySignature: (msg: string, sig: string, publicKey: string) => boolean;
  };
};
const { sm3, sm4, sm2 } = smCrypto;

export interface WormSegment {
  segmentId: string;
  seq: number;
  fromSeq: number;
  toSeq: number;
  eventCount: number;
  segmentHash: string;         // SHA256（既有链式衔接）
  prevSegmentHash: string;
  sourceChainHead: string;
  sourceChainValid: boolean;
  sealedAt: string;
  bytes: number;
  // P5-4 真国密字段
  digestAlg: 'SM3';
  digestSm3: string;          // SM3 摘要 64 hex
  sm4Encrypted: true;
  iv: string;                  // 32 hex（16 字节）
  cipherBytes: string;         // SM4-CBC 密文 hex
  sm2Signature: string;        // 128 hex
  signerKeyId: string;
  keySource: 'env' | 'demo-ephemeral';
}

type SegmentRecord = WormSegment;

interface ProbeRecord {
  probeId: string;
  sourceSegmentId: string;
  tamperedEventCount: number;
  tamperedHash: string;
  tamperedDigestSm3?: string;
  tamperedSignature?: string;
  digestTampered: boolean;
  signatureTampered: boolean;
  sealedAt: string;
}

const probes = new Map<string, ProbeRecord>();
let lastArchivedSeq = 0;
let segmentCounter = 0;
let probeCounter = 0;
let countersHydrated = false;
const GENESIS = 'GENESIS';
let _asyncStore: AsyncWormStore | null = null;
function store(): AsyncWormStore {
  if (_asyncStore) return _asyncStore;
  if (process.env.WORM_BACKEND === 's3') {
    // P5-17 接线：s3 走工厂组装 withResilience(layered(S3, fs))。
    // 用 require 延迟加载避免循环依赖。
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const factory = require('./wormStoreFactory') as typeof import('./wormStoreFactory');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    _asyncStore = factory.createWormStore();
    return _asyncStore;
  }
  _asyncStore = toAsyncStore(getWormStore());
  return _asyncStore;
}

/**
 * 从已持久化的段对齐计数器。
 *
 * fs 后端在进程重启后 segmentCounter / lastArchivedSeq 都是 0，若不回填会造成两个真实故障：
 * 1) 新段 seq 从 1 重排，与磁盘已有段 seq 冲突 → seqContinuity 判定 duplicateSeq，整链 verify 变红；
 * 2) pending 用 seq > lastArchivedSeq 过滤，lastArchivedSeq=0 会把已归档事件再封存一遍，产生重复归档。
 * 因此每次 seal 前按 store 实际内容对齐一次（store 为空时不动，保持首次归档语义）。
 */
async function hydrateCountersFromStore(): Promise<void> {
  if (countersHydrated) return;
  countersHydrated = true;
  const s = store();
  await s.refresh();
  const existing = await s.list();
  if (existing.length === 0) return;
  for (const seg of existing) {
    if (seg.seq > segmentCounter) segmentCounter = seg.seq;
    if (seg.toSeq > lastArchivedSeq) lastArchivedSeq = seg.toSeq;
  }
}

/** 测试与巡检取证用：读取当前计数器。 */
export function __counters(): { segmentCounter: number; lastArchivedSeq: number } {
  return { segmentCounter, lastArchivedSeq };
}

/** P5-13：启动时显式 hydrate，供 audit backfill 取 lastArchivedSeq */
export async function ensureCountersHydrated(): Promise<{ segmentCounter: number; lastArchivedSeq: number }> {
  await hydrateCountersFromStore();
  return { segmentCounter, lastArchivedSeq };
}

/** P5-6：待归档事件数（pending = seq > lastArchivedSeq） */
export function queryAuditEventsCount(): number {
  // P5-13：seal 路径直接读内存 pending 池（不查 DB，避免 seal 变 async）
  const all = getPendingEvents();
  return all.filter((e) => e.seq > lastArchivedSeq).length;
}

/* ------------------------------ 密钥准备（真国密） ------------------------------ */

const DEMO_SM4_KEY = '0123456789abcdef0123456789abcdef'; // 32 hex = 16 bytes
let sm4KeyHex: string;
let sm2PrivateKeyHex: string;
let sm2PublicKeyHex: string;
let sm2KeySource: WormSegment['keySource'];
let signerKeyId: string;

function initKeys(): void {
  // SM4 key
  const envSm4 = process.env.WORM_SM4_KEY;
  if (envSm4 && /^[0-9a-fA-F]{32}$/.test(envSm4)) {
    sm4KeyHex = envSm4.toLowerCase();
  } else if (process.env.DEMO_MODE === '1') {
    sm4KeyHex = DEMO_SM4_KEY;
  } else {
    sm4KeyHex = ''; // seal 时拒绝
  }

  // SM2 keypair（hex）
  const envPriv = process.env.WORM_SM2_PRIVATE_KEY;
  const envPub = process.env.WORM_SM2_PUBLIC_KEY;
  if (envPriv && envPub && /^[0-9a-fA-F]{64}$/.test(envPriv) && /^[0-9a-fA-F]{130}$/.test(envPub)) {
    sm2PrivateKeyHex = envPriv.toLowerCase();
    sm2PublicKeyHex = envPub.toLowerCase();
    sm2KeySource = 'env';
    signerKeyId = `env-${sm2PublicKeyHex.slice(0, 12)}`;
  } else if (process.env.DEMO_MODE === '1') {
    const kp = sm2.generateKeyPairHex();
    sm2PrivateKeyHex = kp.privateKey;
    sm2PublicKeyHex = kp.publicKey;
    sm2KeySource = 'demo-ephemeral';
    signerKeyId = `ephemeral-${sm2PublicKeyHex.slice(0, 12)}`;
  } else {
    // 非 DEMO 且未配置：占位，seal 时拒绝
    sm2PrivateKeyHex = '';
    sm2PublicKeyHex = '';
    sm2KeySource = 'demo-ephemeral';
    signerKeyId = 'unset';
  }
}
initKeys();

// P5-9：把"该 keyId 是否仍被段引用"的检查注册给 KeyProvider。
// 在模块加载时立即挂载（不依赖 /worm/keys 调用），保证 purge 前 checker 已就位。
// P5-10：走 O(1) 索引 countBySigner；索引命中 0 时回退一次真实 list 扫描，
// 防外部写入未 refresh 导致索引滞后而误删（fail-closed 双保险）。
// P5-11b：purge 是破坏性操作，索引 0 命中时先强制一次全量重扫再判定，
// 闭合「目录 mtime 精度窗口内外部写入、autoDetect 判定无变化」的窄窗口漏检——
// 这一路径只在 purge 判定触发一次，不影响热路径性能。
function ensureKeyInUseChecker(): void {
  const p = getKeyProvider() as { setKeyInUseChecker?: (fn: (kid: string) => Promise<number>) => void };
  if (typeof p.setKeyInUseChecker !== 'function') return;
  p.setKeyInUseChecker(async (keyId: string) => {
    const s = store();
    const idx = await s.countBySigner(keyId);
    if (idx > 0) return idx;
    await s.refresh();
    const all = await s.list();
    return all.filter((seg) => seg.signerKeyId === keyId).length;
  });
}
ensureKeyInUseChecker();

/* ------------------------------ 密码学原语 ------------------------------ */

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
function sm3Digest(s: string): string {
  return sm3(s);
}

function serializeEvents(events: AuditEvent[]): string {
  const sorted = events.slice().sort((a, b) => a.seq - b.seq);
  return JSON.stringify(sorted);
}

function computeSegmentHash(prev: string, head: string, body: string): string {
  return sha256(prev + '|' + head + '|' + body);
}
function computeDigestSm3(prev: string, head: string, body: string): string {
  return sm3Digest(prev + '|' + head + '|' + body);
}

function sm4Encrypt(plaintext: string): { cipherHex: string; ivHex: string } {
  if (sm4KeyHex.length !== 32) throw new Error('worm-key-not-configured');
  const ivHex = randomBytes(16).toString('hex');
  const cipherHex = sm4.encrypt(plaintext, sm4KeyHex, { mode: 'cbc', iv: ivHex });
  return { cipherHex, ivHex };
}
function sm4Decrypt(cipherHex: string, ivHex: string): string {
  return sm4.decrypt(cipherHex, sm4KeyHex, { mode: 'cbc', iv: ivHex });
}

function sm2Sign(digestHex: string): { signature: string; keyId: string } {
  const { keyId, privateKeyHex } = getKeyProvider().getSigningKey();
  return { signature: sm2.doSignature(digestHex, privateKeyHex), keyId };
}
export function sm2Verify(digestHex: string, signatureHex: string): boolean {
  // 兼容旧调用：不传 keyId 时用 active key 验
  return getKeyProvider().verify(digestHex, signatureHex).ok;
}

/* ------------------------------ 密钥状态查询 ------------------------------ */

export function keyStatus(): { keySource: string; signerKeyId: string; publicKeyHex: string; sm4Configured: boolean } {
  // P5-8：从 provider 读 active keyId（rotate 后同步）
  ensureKeyInUseChecker();
  const p = getKeyProvider();
  const signing = p.getSigningKey();
  return {
    keySource: p.kind,
    signerKeyId: signing.keyId,
    publicKeyHex: p.getPublicKey(signing.keyId) ?? '',
    sm4Configured: sm4KeyHex.length === 32,
  };
}

/* ------------------------------ seal ------------------------------ */

export interface SealInput { from?: string; to?: string; }
export interface SealResult {
  ok: boolean;
  error?: 'no-events' | 'invalid-window' | 'worm-key-not-configured' | 'worm-no-active-key' | 'seq-gap' | 'worm-seal-disabled-backfill-truncated';
  expectedSeq?: number;
  actualFirstSeq?: number;
  segment?: WormSegment;
  sealDisabledReason?: string;
}

export async function seal(input: SealInput = {}): Promise<SealResult> {
  if (input.from && Number.isNaN(new Date(input.from).getTime())) return { ok: false, error: 'invalid-window' };
  // P5-16 fail-closed：backfill 截断时拒绝产段，避免 pending 池不完整导致段内 seq 断档
  const disabled = __sealDisabled?.();
  if (disabled) {
    return { ok: false, error: 'worm-seal-disabled-backfill-truncated', sealDisabledReason: disabled.reason };
  }
  if (input.to && Number.isNaN(new Date(input.to).getTime())) return { ok: false, error: 'invalid-window' };
  if (sm4KeyHex.length !== 32 || !sm2PrivateKeyHex) return { ok: false, error: 'worm-key-not-configured' };

  await hydrateCountersFromStore();

  const all = getPendingEvents().sort((a, b) => a.seq - b.seq);
  let pending = all.filter((e) => e.seq > lastArchivedSeq);
  if (input.from) {
    const from: string = input.from;
    pending = pending.filter((e) => e.occurredAt >= from);
  }
  if (input.to) {
    const to: string = input.to;
    pending = pending.filter((e) => e.occurredAt <= to);
  }
  if (pending.length === 0) return { ok: false, error: 'no-events' };

  const expectedSeq = lastArchivedSeq + 1;
  const actualFirstSeq = pending[0].seq;
  if (actualFirstSeq !== expectedSeq) {
    return {
      ok: false, error: 'seq-gap',
      expectedSeq, actualFirstSeq,
    } as const;
  }

  const chain = verifyChainSync();
  const sourceChainHead = all.length ? all[all.length - 1].hash : GENESIS;

  const segments = await store().list();
  const prev = segments[segments.length - 1];
  const prevSegmentHash = prev ? prev.segmentHash : GENESIS;
  const body = serializeEvents(pending);
  const segmentHash = computeSegmentHash(prevSegmentHash, sourceChainHead, body);
  const digestSm3 = computeDigestSm3(prevSegmentHash, sourceChainHead, body);
  const { cipherHex, ivHex } = sm4Encrypt(body);
  let sig: { signature: string; keyId: string };
  try {
    sig = sm2Sign(digestSm3);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'worm-no-active-key') return { ok: false, error: 'worm-no-active-key' };
    throw e;
  }
  const { signature: sm2Signature, keyId: sealKeyId } = sig;
  const now = new Date().toISOString();
  const nextSeq = segmentCounter + 1;
  const segmentId = `WORM-${String(nextSeq).padStart(4, '0')}-${Date.now().toString(36)}`;

  const rec: SegmentRecord = {
    segmentId, seq: nextSeq,
    fromSeq: pending[0].seq, toSeq: pending[pending.length - 1].seq,
    eventCount: pending.length, segmentHash, prevSegmentHash,
    sourceChainHead, sourceChainValid: chain.valid,
    sealedAt: now, bytes: Buffer.byteLength(body, 'utf8'),
    digestAlg: 'SM3', digestSm3,
    sm4Encrypted: true, iv: ivHex, cipherBytes: cipherHex,
    sm2Signature, signerKeyId: sealKeyId, keySource: sm2KeySource,
  };
  await store().put(rec);
  segmentCounter = nextSeq;
  lastArchivedSeq = pending[pending.length - 1].seq;

  return { ok: true, segment: rec };
}

/* ------------------------------ 读取 ------------------------------ */

function decryptEvents(rec: SegmentRecord): AuditEvent[] | null {
  try {
    const json = sm4Decrypt(rec.cipherBytes, rec.iv);
    return JSON.parse(json) as AuditEvent[];
  } catch (err) {
    console.warn('[worm] decrypt failed', {
      segmentId: rec.segmentId,
      cipherLen: rec.cipherBytes?.length ?? -1,
      ivLen: rec.iv?.length ?? -1,
      sm4Encrypted: rec.sm4Encrypted,
      keyLen: sm4KeyHex?.length ?? -1,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function metaOf(r: SegmentRecord): WormSegment {
  return { ...r };
}

export async function listSegments(limit = 50, offset = 0): Promise<{ rows: WormSegment[]; total: number }> {
  const all = (await store().list()).map(metaOf);
  return { rows: all.slice(offset, offset + limit), total: all.length };
}

export async function getSegment(segmentId: string): Promise<WormSegment | null> {
  if (!isValidSegmentId(segmentId)) return null;
  const r = await store().get(segmentId);
  return r ? metaOf(r) : null;
}

export async function getSegmentEvents(segmentId: string): Promise<AuditEvent[] | null> {
  if (!isValidSegmentId(segmentId)) return null;
  const r = await store().get(segmentId);
  if (!r) {
    console.warn('[worm] getSegmentEvents: segment not found in async store', { segmentId });
    return null;
  }
  return decryptEvents(r);
}

export async function segmentToCsv(segmentId: string): Promise<string | null> {
  const evts = await getSegmentEvents(segmentId);
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

export async function createProbe(segmentId: string): Promise<{ probeId: string; sourceSegmentId: string } | null> {
  const src = await store().get(segmentId);
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

export function tamperProbeDigest(probeId: string): boolean {
  const p = probes.get(probeId);
  if (!p) return false;
  p.tamperedDigestSm3 = sm3Digest('tampered-' + p.probeId);
  p.digestTampered = true;
  return true;
}

export function tamperProbeSignature(probeId: string): boolean {
  const p = probes.get(probeId);
  if (!p) return false;
  p.tamperedSignature = randomBytes(32).toString('hex').slice(0, 128);
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
  digestValid: boolean;
  signatureValid: boolean;
  seqContinuity: SeqContinuity;
  segmentCount: number;
  probeCount: number;
  brokenSegmentId?: string;
  brokenScope?: 'real' | 'probe';
  reason?: string;
  segments: SegmentCheck[];
}

function checkSeg(seg: SegmentRecord): { digestValid: boolean; signatureValid: boolean; body?: string; sigReason?: 'unknown-key-id' | 'bad-signature' } {
  const evts = decryptEvents(seg);
  if (!evts) return { digestValid: false, signatureValid: false };
  const body = serializeEvents(evts);
  const recomputedHash = computeSegmentHash(seg.prevSegmentHash, seg.sourceChainHead, body);
  if (recomputedHash !== seg.segmentHash) return { digestValid: false, signatureValid: false, body };
  const recomputedSm3 = computeDigestSm3(seg.prevSegmentHash, seg.sourceChainHead, body);
  const digestValid = recomputedSm3 === seg.digestSm3;
  // P5-8：按段 signerKeyId 选公钥验签，未知 keyId 与签名不符明确区分
  const v = getKeyProvider().verify(seg.digestSm3, seg.sm2Signature, seg.signerKeyId);
  return { digestValid, signatureValid: v.ok, body, sigReason: v.ok ? undefined : v.reason };
}

async function verifyReal(): Promise<{
  ok: boolean; brokenSegmentId?: string; reason?: string;
  segmentChecks: SegmentCheck[]; digestValid: boolean; signatureValid: boolean;
  seqContinuity: SeqContinuity;
}> {
  const all = (await store().list()).sort((a, b) => a.seq - b.seq);
  const continuity = checkSeqContinuity(all);
  if (all.length === 0) return { ok: true, segmentChecks: [], digestValid: true, signatureValid: true, seqContinuity: continuity };
  let prevHash = GENESIS;
  const checks: SegmentCheck[] = [];
  let allDigest = true;
  let allSig = true;
  for (const seg of all) {
    if (seg.prevSegmentHash !== prevHash) {
      return { ok: false, brokenSegmentId: seg.segmentId, reason: 'prevSegmentHash 链断裂', segmentChecks: checks, digestValid: allDigest, signatureValid: allSig, seqContinuity: continuity };
    }
    const c = checkSeg(seg);
    if (!c.digestValid || !c.signatureValid) {
      checks.push({ segmentId: seg.segmentId, digestValid: c.digestValid, signatureValid: c.signatureValid });
      // P5-8：未知 keyId（密钥环里没有该公钥）与签名不符（疑似篡改）明确区分
      const reason = c.sigReason === 'unknown-key-id'
        ? `未知签名密钥：段由 ${seg.signerKeyId} 签发，密钥环中无此公钥（unknown-key-id）`
        : c.sigReason === 'bad-signature'
          ? `段 SM2 签名校验失败：段由 ${seg.signerKeyId} 签发（bad-signature，疑似篡改）`
          : `段 SM3 摘要或 SM2 签名校验失败`;
      return { ok: false, brokenSegmentId: seg.segmentId, reason, segmentChecks: checks, digestValid: c.digestValid, signatureValid: c.signatureValid, seqContinuity: continuity };
    }
    if (c.body) {
      const evts = JSON.parse(c.body) as AuditEvent[];
      let expectedSeq = seg.fromSeq;
      for (const e of evts) {
        if (e.seq !== expectedSeq) {
          return { ok: false, brokenSegmentId: seg.segmentId, reason: `seq 不连续：期望 ${expectedSeq}，实际 ${e.seq}`, segmentChecks: checks, digestValid: allDigest, signatureValid: allSig, seqContinuity: continuity };
        }
        expectedSeq += 1;
      }
    }
    checks.push({ segmentId: seg.segmentId, digestValid: true, signatureValid: true });
    prevHash = seg.segmentHash;
  }
  return { ok: true, segmentChecks: checks, digestValid: allDigest, signatureValid: allSig, seqContinuity: continuity };
}

export interface SeqGap { prevToSeq: number; nextFromSeq: number; expected: number; actual: number; }
export interface SeqContinuity {
  valid: boolean;
  gaps: SeqGap[];
  duplicateSeq: number[];
  outOfOrder: boolean;
  startGap?: { expected: number; actual: number };
}

export function checkSeqContinuity(segs: WormSegment[]): SeqContinuity {
  const sorted = segs.slice().sort((a, b) => a.seq - b.seq);
  const gaps: SeqGap[] = [];
  const duplicateSeq: number[] = [];
  let outOfOrder = false;
  // 段 seq 1..N
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].seq !== i + 1) outOfOrder = true;
  }
  // 相邻段 from/to 衔接
  for (let i = 1; i < sorted.length; i++) {
    const prevTo = sorted[i - 1].toSeq;
    const nextFrom = sorted[i].fromSeq;
    if (nextFrom !== prevTo + 1) {
      gaps.push({ prevToSeq: prevTo, nextFromSeq: nextFrom, expected: prevTo + 1, actual: nextFrom });
    }
  }
  // 段内 fromSeq 重复
  const fromSet = new Set<number>();
  for (const s of sorted) {
    if (fromSet.has(s.fromSeq)) duplicateSeq.push(s.fromSeq);
    fromSet.add(s.fromSeq);
  }
  // 首段 fromSeq 应为 1
  let startGap: SeqContinuity['startGap'];
  if (sorted.length > 0 && sorted[0].fromSeq !== 1) {
    startGap = { expected: 1, actual: sorted[0].fromSeq };
  }
  const valid = !outOfOrder && gaps.length === 0 && duplicateSeq.length === 0;
  return { valid, gaps, duplicateSeq, outOfOrder, startGap };
}

async function verifyProbes(): Promise<{ broken: boolean; probeId?: string; reason?: string }> {
  for (const probe of probes.values()) {
    const src = await store().get(probe.sourceSegmentId);
    if (!src) continue;
    const evts = await getSegmentEvents(src.segmentId);
    if (probe.tamperedEventCount !== evts?.length) {
      return { broken: true, probeId: probe.probeId, reason: '探针 eventCount 与实际 events 不一致（预期）' };
    }
    if (probe.digestTampered && probe.tamperedDigestSm3 !== src.digestSm3) {
      return { broken: true, probeId: probe.probeId, reason: '探针段 SM3 摘要被篡改（预期）' };
    }
    if (probe.signatureTampered && probe.tamperedSignature !== src.sm2Signature) {
      return { broken: true, probeId: probe.probeId, reason: '探针段 SM2 签名被篡改（预期）' };
    }
  }
  return { broken: false };
}

export async function verify(scope: 'all' | 'real' = 'all'): Promise<VerifyResult> {
  const real = await verifyReal();
  const realChainValid = real.ok;
  const segmentCount = (await store().list()).length;
  const seqContinuity = real.seqContinuity;

  if (scope === 'real') {
    const valid = realChainValid && seqContinuity.valid && real.digestValid && real.signatureValid;
    return {
      valid,
      realChainValid,
      probeBroken: false,
      digestValid: real.digestValid,
      signatureValid: real.signatureValid,
      seqContinuity,
      segmentCount,
      probeCount: probes.size,
      brokenSegmentId: realChainValid ? undefined : real.brokenSegmentId,
      brokenScope: realChainValid ? undefined : 'real',
      reason: real.reason ?? (seqContinuity.valid ? undefined : '跨段 seq 不连续'),
      segments: real.segmentChecks,
    };
  }

  const probe = await verifyProbes();
  const probeBroken = probe.broken;
  const valid = realChainValid && seqContinuity.valid && !probeBroken && real.digestValid && real.signatureValid;
  return {
    valid,
    realChainValid,
    probeBroken,
    digestValid: real.digestValid,
    signatureValid: real.signatureValid,
    seqContinuity,
    segmentCount,
    probeCount: probes.size,
    brokenSegmentId: realChainValid ? (probeBroken ? probe.probeId : undefined) : real.brokenSegmentId,
    brokenScope: realChainValid ? (probeBroken ? 'probe' : undefined) : 'real',
    reason: realChainValid ? probe.reason : real.reason,
    segments: real.segmentChecks,
  };
}

/* ------------------------------ store info ------------------------------ */

export async function storeInfo(): Promise<{ kind: string; segmentCount: number; dir?: string; writable: boolean; oldestSeq: number | null; newestSeq: number | null }> {
  if (process.env.WORM_BACKEND === 's3') {
    // s3 模式走 async store（layered(S3, fs)），保证读路径与写路径一致
    const asyncStore = store();
    const all = await asyncStore.list();
    const oldest = all.length ? all[0].fromSeq : null;
    const newest = all.length ? all[all.length - 1].toSeq : null;
    const info = getWormBackendInfo();
    return {
      kind: 's3',
      segmentCount: all.length,
      dir: info.dir,
      writable: true,
      oldestSeq: oldest,
      newestSeq: newest,
    };
  }
  const s = getWormStore();
  const all = s.list();
  const oldest = all.length ? all[0].fromSeq : null;
  const newest = all.length ? all[all.length - 1].toSeq : null;
  return {
    kind: s.kind,
    segmentCount: all.length,
    dir: s.kind === 'fs' ? (s as unknown as { dir: string }).dir : undefined,
    writable: true,
    oldestSeq: oldest,
    newestSeq: newest,
  };
}

/* ------------------------------ 工具 ------------------------------ */

export function __resetStore(): void {
  if (process.env.WORM_BACKEND === 's3') {
    // s3 模式不支持同步 reset（会清掉 local fs 但 S3 远端还在）。测试请用独立 store 或 afterAll DROP。
    throw new Error('__resetStore: WORM_BACKEND=s3 not supported; reset local+remote together via test harness');
  }
  // Memory store：清空；File store：由单测指定临时目录，不删磁盘文件
  const s = getWormStore();
  if (s.kind === 'memory') {
    // 清 map：memory store 内部 __clear 方法（本地扩展，非公开接口）
    const mem = s as unknown as { __clear?: () => void };
    mem.__clear?.();
  }
  _asyncStore = null;
  probes.clear();
  lastArchivedSeq = 0;
  segmentCounter = 0;
  probeCounter = 0;
  countersHydrated = false;
}

export async function __getCipherHex(segmentId: string): Promise<string | null> {
  return (await store().get(segmentId))?.cipherBytes ?? null;
}

/** 仅用于单测：暴露 sm3 标准向量 */
export function __sm3StandardVector(): string {
  return sm3('abc');
}
