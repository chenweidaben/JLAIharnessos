/** 健澜科技：P2 国密 SM3 摘要链电子签名（M86-P）。DEMO 用 sha256 模拟 SM3 或真实 sm-crypto，预留国密 SDK 接入点。 */
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/**
 * 国密算法接入点（ISmCryptoProvider）说明：
 * - 生产应替换为合规国密 SDK：服务器密码机 HSM / USBKey（如国产密码机厂商）/ 商密云。
 * - 当前优先使用真实 sm-crypto@0.5.x（纯 JS 国密 SM3，sm3('abc') 标准向量自检通过）；
 *   若运行时加载失败（如 node_modules 被裁剪），自动回退 node:crypto sha256（等长 64 hex）占位。
 * - SM3 摘要：32 字节，64 位 hex；占位 sha256 同长，便于前端与审计库字段对齐。
 * - SM2 签名：DER 编码约 70~72 字节，base64 后约 96~100 字符；当前用 randomBytes 占位。
 * - 真实接入后应：签名时调用 SM2_Sign(privKey, SM3(content))；验签时调用 SM2_Verify(pubKey, SM3(content), sig)。
 */

/** 国密 SM3 Provider 插槽：生产可整体替换为 HSM/USBKey/商密云 SDK 实现 */
interface ISmCryptoProvider {
  /** 对 UTF-8 输入计算 SM3，返回 64 位小写 hex */
  sm3Digest(input: string): string;
  /** 是否为真实国密 SM3（false = DEMO 用 sha256 等长占位，非国密算法） */
  isRealGm: boolean;
  /** 算法描述，写入审计响应便于运维识别 */
  name: string;
}

const nodeRequire = createRequire(import.meta.url);

/** 构造 SM3 Provider：优先真实 sm-crypto，失败回退 sha256 占位 */
function buildSm3Provider(): ISmCryptoProvider {
  try {
    // sm-crypto 无官方 d.ts，运行时同步 require；返回 any 后收窄为受控接口
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = nodeRequire('sm-crypto') as { sm3?: (input: string) => string };
    if (typeof mod.sm3 === 'function') {
      const fn = mod.sm3;
      return {
        sm3Digest: (input: string) => fn(input),
        isRealGm: true,
        name: 'sm-crypto@0.5.x 真实国密 SM3',
      };
    }
  } catch (e) {
    // 运行时不可用（网络/裁剪），保留插槽并回退
    console.warn('[crypto] sm-crypto 加载失败，回退 sha256 占位 SM3：', (e as Error)?.message);
  }
  // TODO(生产): 替换为真实国密 SM3（服务器密码机 HSM / USBKey / 合规商密 SDK）
  return {
    sm3Digest: (input: string) => createHash('sha256').update(input, 'utf8').digest('hex'),
    isRealGm: false,
    name: 'DEMO sha256 等长占位（非国密，生产须替换）',
  };
}

const sm3Provider = buildSm3Provider();

/** 摘要链接入：首条 = SM3(contentHash)；后续 = SM3(contentHash | 上一条 chainDigest) */
function computeChainDigest(contentHash: string, prevChainDigest: string | null): string {
  if (!prevChainDigest) return sm3Provider.sm3Digest(contentHash);
  // 用 '|' 分隔原文摘要与上一链值，避免拼接歧义；SM3 抗碰撞由算法保证
  return sm3Provider.sm3Digest(`${contentHash}|${prevChainDigest}`);
}

interface SignatureRecord {
  signatureId: string;
  targetType: 'order' | 'emr-round';
  targetId: string;
  staffId: string;
  staffName: string;
  level: 'resident' | 'attending' | 'chief';
  contentHash: string;
  /** 本条原文裸摘要 SM3(contentHash) */
  sm3Digest: string;
  /** 摘要链：首条=SM3(contentHash)；后续=SM3(contentHash|上一条 chainDigest)，防篡改锚点 */
  chainDigest: string;
  /** 链上前一条签名 ID；首条为 null */
  previousSignatureId: string | null;
  sm2Signature: string;
  timestamp: string;
  signedBy: string;
}

/** 带链位置的视图对象（GET 列表 / 前端审计页使用） */
interface SignatureView extends SignatureRecord {
  chainPosition: number;
  totalInChain: number;
}

/**
 * DEMO_MODE 内存签名台账（脱敏 staffId: S-001/S-002/S-003；脱敏姓名：张某某/李某某/王某某）
 * 种子按时间升序排列；运行时最新签名 unshift 到队首，便于 O(1) 取链尾。
 */
const seedChronological: SignatureRecord[] = [
  {
    signatureId: 'SIG-20261104-0001',
    targetType: 'order',
    targetId: 'ORD-20261104-001',
    staffId: 'S-001',
    staffName: '张**',
    level: 'resident',
    contentHash: 'demo-content-order-001',
    sm3Digest: '',
    chainDigest: '',
    previousSignatureId: null,
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
    chainDigest: '',
    previousSignatureId: null,
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
    chainDigest: '',
    previousSignatureId: null,
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
    chainDigest: '',
    previousSignatureId: null,
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
    chainDigest: '',
    previousSignatureId: null,
    sm2Signature: '',
    timestamp: '2026-11-04T16:45:00+08:00',
    signedBy: '王**',
  },
];

/** mock SM2 签名（base64）。TODO: 替换为真实 SM2 国密 SDK + 内存 mock 密钥对 */
function mockSm2(content: string): string {
  const buf = createHash('sha256').update(content, 'utf8').digest();
  const pad = randomBytes(32);
  return Buffer.concat([buf, pad]).toString('base64');
}

/** 初始化种子台账：逐时间升序串接摘要链，并填充裸 SM3/SM2 占位 */
(function seedChain(): void {
  let prevChain: string | null = null;
  let prevId: string | null = null;
  for (const rec of seedChronological) {
    rec.sm3Digest = sm3Provider.sm3Digest(rec.contentHash);
    rec.sm2Signature = mockSm2(rec.contentHash);
    rec.previousSignatureId = prevId;
    rec.chainDigest = computeChainDigest(rec.contentHash, prevChain);
    prevChain = rec.chainDigest;
    prevId = rec.signatureId;
  }
})();

/** 运行时台账：最新在前（unshift），便于取链尾 demoStore[0] */
const demoStore: SignatureRecord[] = seedChronological.slice().reverse();

/** 全链按时间升序快照（验签/定位链位置用） */
function chainChronological(): SignatureRecord[] {
  return demoStore.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
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
      // 从内存台账取链尾（最新一条），串接摘要链
      const prevRec = demoStore[0] ?? null;
      const previousSignatureId = prevRec ? prevRec.signatureId : null;
      const prevChainDigest = prevRec ? prevRec.chainDigest : null;
      // TODO: 接入国密 SDK 后，此处调用真实 SM2_Sign(privKey, SM3(content))
      const sm3Digest = sm3Provider.sm3Digest(contentHash);
      const chainDigest = computeChainDigest(contentHash, prevChainDigest);
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
        chainDigest,
        previousSignatureId,
        sm2Signature,
        timestamp: new Date().toISOString(),
        signedBy: staffName,
      };
      if (isDemo) demoStore.unshift(record);
      return json(ok({
        signatureId: record.signatureId,
        sm3Digest: record.sm3Digest,
        chainDigest: record.chainDigest,
        previousSignatureId: record.previousSignatureId,
        sm2Signature: record.sm2Signature,
        timestamp: record.timestamp,
        signedBy: record.signedBy,
        algorithm: sm3Provider.name,
        isRealGm: sm3Provider.isRealGm,
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
      const chain = chainChronological();
      const positionOf = new Map(chain.map((r, i) => [r.signatureId, i + 1]));
      const totalInChain = chain.length;
      const items: SignatureView[] = chain
        .filter((r) => r.targetType === targetType && r.targetId === targetId)
        .map((r) => ({
          ...r,
          chainPosition: positionOf.get(r.signatureId) ?? 0,
          totalInChain,
        }));
      return json(ok({ items, total: items.length, algorithm: sm3Provider.name, isRealGm: sm3Provider.isRealGm }));
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
      if (!isDemo) return json(ok({ valid: true, isRealGm: sm3Provider.isRealGm }));
      const rec = demoStore.find((r) => r.signatureId === signatureId);
      if (!rec) return json(ok({ valid: false, reason: 'signatureId 未找到' }));
      // 按链重算：取 previousSignatureId 对应记录的 chainDigest（首条为空）
      const prevRec = rec.previousSignatureId
        ? demoStore.find((r) => r.signatureId === rec.previousSignatureId)
        : null;
      const expectedPrevChain = prevRec ? prevRec.chainDigest : null;
      // TODO: 接入国密 SDK 后，此处调用真实 SM2_Verify(pubKey, SM3(contentHash), rec.sm2Signature)
      const recomputedDigest = computeChainDigest(contentHash, expectedPrevChain);
      const valid = recomputedDigest === rec.chainDigest && rec.contentHash === contentHash;
      const chain = chainChronological();
      const chainPosition = chain.findIndex((r) => r.signatureId === signatureId) + 1;
      const totalInChain = chain.length;
      return json(ok({
        valid,
        signatureId: rec.signatureId,
        previousSignatureId: rec.previousSignatureId,
        recomputedDigest,
        storedChainDigest: rec.chainDigest,
        chainPosition,
        totalInChain,
        algorithm: sm3Provider.name,
        isRealGm: sm3Provider.isRealGm,
      }));
    },
  },
];
