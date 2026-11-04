/**
 * 健澜AI原生医院操作系统OS - P0-6 临床电子签名（国密 SM2/SM3 + TSA 时间戳）
 *
 * 对病历(emr)/医嘱(order)/护理记录(nursing-record)做可靠电子签名：
 *  - 签名内容 = SM3(业务对象原文)
 *  - 签名 = SM2.sign(SM3摘要, 签署人私钥)；验签 = SM2.verify(摘要, 签名, 公钥)
 *  - mock TSA 对摘要加盖时间戳，返回 {tsaToken, tsaTime, tsaCertId}（生产接第三方 TSA）
 *  - 签名记录含 prevHash 链（前一条签名摘要），防篡改
 *
 * 角色权限：doctor 可签 emr/order；nurse 可签 nursing-record；admin 全签；
 * 非对应角色签名 403。同一 objectType+objectId 重复签名幂等返回原签名。
 *
 * 注意：与既有 eSignatureAggregator（SHA-256 封存笔迹）独立，不修改其行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as smCrypto from 'sm-crypto';

const { sm2, sm3 } = smCrypto;

export type ClinicalObjectType = 'emr' | 'order' | 'nursing-record';
export const CLINICAL_OBJECT_TYPES: readonly ClinicalObjectType[] = [
  'emr',
  'order',
  'nursing-record',
];

export interface ClinicalSignature {
  signId: string;
  objectType: ClinicalObjectType;
  objectId: string;
  sm3Digest: string;
  signature: string;          // SM2 签名 hex
  publicKey: string;          // 签署人公钥（验签用）
  signedBy: string;
  signedByName?: string;
  signedAt: number;
  tsaToken: string;
  tsaTime: number;
  tsaCertId: string;
  prevHash: string;           // 前一条签名的 sm3Digest（哈希链）
  verifyStatus: 'valid' | 'pending';
}

export interface TsaStamp {
  tsaToken: string;
  tsaTime: number;
  tsaCertId: string;
}

export class ClinicalSignatureError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// 内存台账
const ledger = new Map<string, ClinicalSignature>();
// 幂等键 objectType|objectId -> signId
const byObject = new Map<string, string>();
// 每签署人一把 SM2 密钥对（首次签名时生成）
const keyPairs = new Map<string, { publicKey: string; privateKey: string }>();

let signSeq = 0;
let lastDigest = '0'.repeat(64); // 哈希链创世 prevHash

const HOUR_MS = 3_600_000;

function keyFor(signedBy: string): { publicKey: string; privateKey: string } {
  let kp = keyPairs.get(signedBy);
  if (!kp) {
    const g = sm2.generateKeyPairHex();
    kp = { publicKey: g.publicKey, privateKey: g.privateKey };
    keyPairs.set(signedBy, kp);
  }
  return kp;
}

/** mock TSA：对摘要加盖时间戳。 */
function stampTsa(digest: string, now: number): TsaStamp {
  return {
    tsaToken: `TSA-${Buffer.from(`${digest.slice(0, 16)}:${now}`).toString('base64url')}`,
    tsaTime: now,
    tsaCertId: 'MOCK-TSA-SM2-CERT-0001',
  };
}

/** 角色权限：doctor→emr/order，nurse→nursing-record，admin→全部。 */
function assertSignRole(roles: string[], objectType: ClinicalObjectType): void {
  if (roles.includes('admin')) return;
  if (objectType === 'nursing-record') {
    if (!roles.includes('nurse')) {
      throw new ClinicalSignatureError(403, '护理记录需护士角色签名');
    }
    return;
  }
  // emr / order
  if (!roles.includes('doctor')) {
    throw new ClinicalSignatureError(403, '病历/医嘱需医生角色签名');
  }
}

export interface SignInput {
  objectType: string;
  objectId: string;
  content: string;
  roles: string[];
  signedBy: string;
  signedByName?: string;
  now?: number;
}

/**
 * 对临床对象签名。
 * - objectType 非法 / objectId 空 / content 空 → 400
 * - 角色不匹配 → 403
 * - 同一 objectType+objectId 已签 → 幂等返回原签名
 * - 否则算 SM3 摘要、SM2 签名、TSA 时间戳、prevHash 链
 */
export function signClinicalObject(input: SignInput): ClinicalSignature {
  const now = input.now ?? Date.now();
  if (!CLINICAL_OBJECT_TYPES.includes(input.objectType as ClinicalObjectType)) {
    throw new ClinicalSignatureError(400, 'objectType 必须为 emr/order/nursing-record 之一');
  }
  const objectType = input.objectType as ClinicalObjectType;
  if (!input.objectId) throw new ClinicalSignatureError(400, 'objectId 必填');
  if (typeof input.content !== 'string' || input.content.length === 0) {
    throw new ClinicalSignatureError(400, '签名内容 content 必填');
  }

  assertSignRole(input.roles, objectType);

  const idemKey = `${objectType}|${input.objectId}`;
  const existingId = byObject.get(idemKey);
  if (existingId) {
    const existing = ledger.get(existingId);
    if (existing) return existing;
  }

  const digest = sm3(input.content);
  const kp = keyFor(input.signedBy);
  const signature = sm2.doSignature(digest, kp.privateKey);
  const tsa = stampTsa(digest, now);

  signSeq += 1;
  const rec: ClinicalSignature = {
    signId: `CSIG-${String(signSeq).padStart(4, '0')}`,
    objectType,
    objectId: input.objectId,
    sm3Digest: digest,
    signature,
    publicKey: kp.publicKey,
    signedBy: input.signedBy,
    signedByName: input.signedByName,
    signedAt: now,
    tsaToken: tsa.tsaToken,
    tsaTime: tsa.tsaTime,
    tsaCertId: tsa.tsaCertId,
    prevHash: lastDigest,
    verifyStatus: 'valid',
  };
  ledger.set(rec.signId, rec);
  byObject.set(idemKey, rec.signId);
  lastDigest = digest;
  return rec;
}

export interface VerifyInput {
  signId: string;
  content?: string;
}

/**
 * 验签。
 * - signId 不存在 → 404
 * - 若提供 content：重算 SM3 并与留存摘要比对，不一致 → 400 valid=false（篡改）
 * - 用留存公钥 SM2.verify 签名摘要
 */
export function verifyClinicalObject(input: VerifyInput): { valid: boolean; signId: string; reason?: string } {
  const rec = ledger.get(input.signId);
  if (!rec) throw new ClinicalSignatureError(404, `签名不存在: ${input.signId}`);

  if (typeof input.content === 'string' && input.content.length > 0) {
    const recomputed = sm3(input.content);
    if (recomputed !== rec.sm3Digest) {
      return { valid: false, signId: rec.signId, reason: '内容摘要与留存不符（疑似篡改）' };
    }
  }

  let valid = false;
  try {
    valid = sm2.doVerifySignature(rec.sm3Digest, rec.signature, rec.publicKey);
  } catch {
    valid = false;
  }
  return { valid, signId: rec.signId, reason: valid ? undefined : 'SM2 验签失败' };
}

/** 按对象列出签名（时间正序）。 */
export function listObjectSignatures(objectType: string, objectId: string): ClinicalSignature[] {
  if (!CLINICAL_OBJECT_TYPES.includes(objectType as ClinicalObjectType)) {
    throw new ClinicalSignatureError(400, 'objectType 非法');
  }
  const out = Array.from(ledger.values()).filter(
    (s) => s.objectType === objectType && s.objectId === objectId,
  );
  out.sort((a, b) => a.signedAt - b.signedAt);
  return out;
}

/** 单测隔离：清空台账并重播种子。 */
export function __resetStore(): void {
  ledger.clear();
  byObject.clear();
  keyPairs.clear();
  signSeq = 0;
  lastDigest = '0'.repeat(64);
}

// seed 一把演示密钥对（滚动时间基准由运行时 now 承载，无远古时间戳）
void HOUR_MS;
