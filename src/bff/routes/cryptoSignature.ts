/** 健澜科技：P2 国密 SM2/SM3 电子签名骨架（M86-J）。DEMO_MODE 下 mock 密钥对与摘要，预留国密 SDK 接入点。 */
import { createHash, randomBytes } from 'node:crypto';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/**
 * 国密算法接入点占位说明：
 * - TODO: 接入国密 SDK（如 sm-crypto / 海泰 USBKey / 服务器密码机 HSM），替换下方 mock 实现。
 * - SM3 摘要：32 字节，64 位 hex；当前用 node:crypto createHash('sha256') 占位，等长 64 hex，便于前端与审计库字段对齐。
 * - SM2 签名：DER 编码约 70~72 字节，base64 后约 96~100 字符；当前用 randomBytes 占位。
 * - 真实接入后应：签名时调用 SM2_Sign(privKey, SM3(content))；验签时调用 SM2_Verify(pubKey, SM3(content), sig)。
 */

interface SignatureRecord {
  signatureId: string;
  targetType: 'order' | 'emr-round';
  targetId: string;
  staffId: string;
  staffName: string;
  level: 'resident' | 'attending' | 'chief';
  contentHash: string;
  sm3Digest: string;
  sm2Signature: string;
  timestamp: string;
  signedBy: string;
}

/** DEMO_MODE 内存签名台账（脱敏 staffId: S-001/S-002/S-003；脱敏姓名：张某某/李某某/王某某） */
const demoStore: SignatureRecord[] = [
  {
    signatureId: 'SIG-20261104-0001',
    targetType: 'order',
    targetId: 'ORD-20261104-001',
    staffId: 'S-001',
    staffName: '张**',
    level: 'resident',
    contentHash: 'demo-content-order-001',
    sm3Digest: '',
    sm2Signature: '',
    timestamp: '2026-11-04T09:12:00+08:00',
    signedBy: '张**',
  },
  {
    signatureId: 'SIG-20261104-0002',
    targetType: 'emr-round',
    targetId: 'ROUND-20261103-001',
    staffId: 'S-002',
    staffName: '李**',
    level: 'attending',
    contentHash: 'demo-content-round-001',
    sm3Digest: '',
    sm2Signature: '',
    timestamp: '2026-11-04T10:05:00+08:00',
    signedBy: '李**',
  },
  {
    signatureId: 'SIG-20261104-0003',
    targetType: 'emr-round',
    targetId: 'ROUND-20261103-001',
    staffId: 'S-003',
    staffName: '王**',
    level: 'chief',
    contentHash: 'demo-content-round-001',
    sm3Digest: '',
    sm2Signature: '',
    timestamp: '2026-11-04T11:30:00+08:00',
    signedBy: '王**',
  },
  {
    signatureId: 'SIG-20261104-0004',
    targetType: 'order',
    targetId: 'ORD-20261104-002',
    staffId: 'S-002',
    staffName: '李**',
    level: 'attending',
    contentHash: 'demo-content-order-002',
    sm3Digest: '',
    sm2Signature: '',
    timestamp: '2026-11-04T14:20:00+08:00',
    signedBy: '李**',
  },
  {
    signatureId: 'SIG-20261104-0005',
    targetType: 'emr-round',
    targetId: 'ROUND-20261103-002',
    staffId: 'S-003',
    staffName: '王**',
    level: 'chief',
    contentHash: 'demo-content-round-002',
    sm3Digest: '',
    sm2Signature: '',
    timestamp: '2026-11-04T16:45:00+08:00',
    signedBy: '王**',
  },
];

/** mock SM3 摘要（64 位 hex）。TODO: 替换为真实 SM3 国密 SDK */
function mockSm3(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** mock SM2 签名（base64）。TODO: 替换为真实 SM2 国密 SDK + 内存 mock 密钥对 */
function mockSm2(content: string): string {
  const buf = createHash('sha256').update(content, 'utf8').digest();
  const pad = randomBytes(32);
  return Buffer.concat([buf, pad]).toString('base64');
}

/** 初始化 demo 台账的 sm3/sm2 占位字段 */
for (const rec of demoStore) {
  rec.sm3Digest = mockSm3(rec.contentHash);
  rec.sm2Signature = mockSm2(rec.contentHash);
}

function isTargetType(v: unknown): v is 'order' | 'emr-round' {
  return v === 'order' || v === 'emr-round';
}

function isLevel(v: unknown): v is 'resident' | 'attending' | 'chief' {
  return v === 'resident' || v === 'attending' || v === 'chief';
}

export const cryptoSignatureRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/crypto/signatures',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const { targetType, targetId, staffId, staffName, level, contentHash } = body as {
        targetType?: string; targetId?: string; staffId?: string; staffName?: string;
        level?: string; contentHash?: string;
      };
      if (!isTargetType(targetType)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'targetType 必须为 order|emr-round'), 400);
      }
      if (!targetId || typeof targetId !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'targetId 必填'), 400);
      }
      if (!staffId || typeof staffId !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'staffId 必填'), 400);
      }
      if (!staffName || typeof staffName !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'staffName 必填'), 400);
      }
      if (level !== undefined && !isLevel(level)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'level 必须为 resident|attending|chief'), 400);
      }
      if (!contentHash || typeof contentHash !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'contentHash 必填'), 400);
      }
      // TODO: 接入国密 SDK 后，此处调用真实 SM2_Sign(privKey, SM3(content))
      const sm3Digest = mockSm3(contentHash);
      const sm2Signature = mockSm2(contentHash);
      const record: SignatureRecord = {
        signatureId: `SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        targetType,
        targetId,
        staffId,
        staffName,
        level: level ?? 'attending',
        contentHash,
        sm3Digest,
        sm2Signature,
        timestamp: new Date().toISOString(),
        signedBy: staffName,
      };
      if (isDemo) demoStore.unshift(record);
      return json(ok({
        signatureId: record.signatureId,
        sm3Digest: record.sm3Digest,
        sm2Signature: record.sm2Signature,
        timestamp: record.timestamp,
        signedBy: record.signedBy,
      }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/crypto/signatures/:targetType/:targetId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const { targetType, targetId } = c.params;
      if (!isTargetType(targetType)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'targetType 必须为 order|emr-round'), 400);
      }
      if (!isDemo) return json(ok({ items: [], total: 0 }));
      const items = demoStore.filter((r) => r.targetType === targetType && r.targetId === targetId);
      return json(ok({ items, total: items.length }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/crypto/signatures/verify',
    auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      const body = await _c.body().catch(() => ({} as Record<string, unknown>));
      const { signatureId, contentHash } = body as { signatureId?: string; contentHash?: string };
      if (!signatureId || typeof signatureId !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'signatureId 必填'), 400);
      }
      if (!contentHash || typeof contentHash !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'contentHash 必填'), 400);
      }
      if (!isDemo) return json(ok({ valid: true }));
      const rec = demoStore.find((r) => r.signatureId === signatureId);
      if (!rec) return json(ok({ valid: false, reason: 'signatureId 未找到' }));
      // TODO: 接入国密 SDK 后，此处调用真实 SM2_Verify(pubKey, SM3(contentHash), rec.sm2Signature)
      const recomputed = mockSm3(contentHash);
      const valid = recomputed === rec.sm3Digest && rec.contentHash === contentHash;
      return json(ok({ valid }));
    },
  },
];
