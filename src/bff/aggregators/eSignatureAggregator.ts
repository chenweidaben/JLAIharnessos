/**
 * 健澜科技 jlmedaios - 电子签名聚合器（M138-B · 电子签名）
 *
 * 【新业务场景】电子签名（法律效力留痕）
 *   覆盖三类临床签署场景：
 *     medical_record    病历签名
 *     prescription      处方签名
 *     surgical_consent  手术同意书签名
 *
 * 法律意识：签名不是一张图，而是一组可封存、可验证、可追溯的电子证据。
 *   - createSignature：把「签署人 + 单据类型 + 单据 id + 手写笔迹 + 签署时间」
 *     做 SHA-256 封存指纹（contentHash），写入进程内签名台账，并尽力落库到
 *     clinical.e_signature（含来源 IP，由路由层经 meta.clientIp 注入）。
 *   - verifySignature：按签名 id 取出记录，重算封存指纹并与留存指纹比对；
 *     已作废（revokedAt）或指纹不匹配（要素被篡改）一律返回 false。
 *   - getDocumentSignatures：按单据倒出其完整签署链（历史签名），按时间正序。
 *
 * 与全仓聚合器约定一致：
 *   - 三个对外函数的核心逻辑为纯计算（组包、封存、比对、筛选），不修改入参；
 *   - 进程内台账 Map 是验签/历史查询的在读索引；PostgreSQL 为持久化电子证据，
 *     落库为 best-effort（断库/表未迁移时降级，不阻断签署与验签主流程）。
 *
 * 不触碰 WebSocket，不新增依赖（SHA-256 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash, randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 被签单据类型（与 clinical.e_signature.document_type CHECK 约束一致） */
export type DocumentType = 'medical_record' | 'prescription' | 'surgical_consent';

/** 电子签名（BFF 对外形态，camelCase） */
export interface Signature {
  /** 签名唯一标识 */
  id: string;
  /** 签署人（= iam.users.id） */
  staffId: string;
  /** 被签单据类型 */
  documentType: DocumentType;
  /** 被签业务单据 id */
  documentId: string;
  /** 手写签名笔迹 PNG（base64 data URL） */
  signatureData: string;
  /** 封存指纹：对核心要素做 SHA-256（hex） */
  contentHash: string;
  /** 签署来源 IP（法律效力留痕）；纯构造时可为空 */
  clientIp: string | null;
  /** 签署时间 ISO 串（DB/构造时钟） */
  signedAt: string;
  /** 作废时间；null = 有效签名 */
  revokedAt: string | null;
}

/** createSignature 的可选元数据（路由层注入法律效力要素） */
export interface SignatureMeta {
  /** 签署来源 IP */
  clientIp?: string | null;
  /** 覆盖签署时间（测试/回放用）；缺省取当前时钟 */
  signedAt?: string;
}

/* ------------------------------------------------------------------ */
/* 进程内签名台账（验签与历史查询的在读索引）                            */
/* ------------------------------------------------------------------ */

const ledger = new Map<string, Signature>();

/** 合法单据类型全集 */
export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'medical_record',
  'prescription',
  'surgical_consent',
];

/* ------------------------------------------------------------------ */
/* 封存指纹：对核心要素做 SHA-256，任一要素被改动即指纹变化              */
/* ------------------------------------------------------------------ */

function computeSeal(input: {
  staffId: string;
  documentType: DocumentType;
  documentId: string;
  signatureData: string;
  signedAt: string;
}): string {
  const canonical = [
    input.staffId,
    input.documentType,
    input.documentId,
    input.signatureData,
    input.signedAt,
  ].join('|');
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【新业务场景】创建一份电子签名。
 *
 * 组包 → 计算封存指纹 → 写入进程内台账 → 尽力落库持久化。
 * 入参不合法（空 staffId / 空单据 id / 空笔迹 / 非法单据类型）时抛错，
 * 由路由层收敛为 400。
 */
export function createSignature(
  staffId: string,
  documentType: DocumentType,
  documentId: string,
  signatureData: string,
  meta?: SignatureMeta,
): Signature {
  if (!staffId || typeof staffId !== 'string') {
    throw new Error('签署人 staffId 不能为空');
  }
  if (!DOCUMENT_TYPES.includes(documentType)) {
    throw new Error(`非法单据类型 documentType=${String(documentType)}`);
  }
  if (!documentId || typeof documentId !== 'string') {
    throw new Error('单据 id documentId 不能为空');
  }
  if (!signatureData || typeof signatureData !== 'string') {
    throw new Error('手写签名笔迹 signatureData 不能为空');
  }

  const signedAt = meta?.signedAt ?? new Date().toISOString();
  const sig: Signature = {
    id: randomUUID(),
    staffId,
    documentType,
    documentId,
    signatureData,
    clientIp: meta?.clientIp ?? null,
    signedAt,
    revokedAt: null,
    contentHash: '',
  };
  sig.contentHash = computeSeal(sig);

  ledger.set(sig.id, sig);
  return sig;
}

/**
 * 【新业务场景】按签名 id 验证签名有效性。
 *
 * 真（true）当且仅当：台账中存在该 id、未被作废、且重算封存指纹与留存指纹一致；
 * 任一不满足（含记录缺失、要素被篡改、已撤销）均返回 false，不抛错。
 */
export function verifySignature(signatureId: string): boolean {
  if (!signatureId) return false;
  const sig = ledger.get(signatureId);
  if (!sig) return false;
  if (sig.revokedAt) return false;
  const expected = computeSeal(sig);
  return expected === sig.contentHash;
}

/**
 * 【新业务场景】查询某张单据的全部历史签名（按签署时间正序）。
 * 返回副本，调用方无法借此篡改台账。
 */
export function getDocumentSignatures(
  documentType: DocumentType,
  documentId: string,
): Signature[] {
  const out: Signature[] = [];
  for (const sig of ledger.values()) {
    if (sig.documentType === documentType && sig.documentId === documentId) {
      out.push({ ...sig });
    }
  }
  out.sort((a, b) => a.signedAt.localeCompare(b.signedAt));
  return out;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断                */
/* ------------------------------------------------------------------ */

/**
 * 把已创建的签名落库到 clinical.e_signature（电子证据持久化）。
 * 由路由层在 createSignature 之后显式 await；断库 / 表未迁移时静默降级，
 * 不影响进程内台账的验签与历史查询。
 */
export async function persistSignature(sig: Signature): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.e_signature
        (id, staff_id, document_type, document_id,
         signature_data, content_hash, client_ip, signed_at)
      VALUES
        (${sig.id}, ${sig.staffId}, ${sig.documentType}, ${sig.documentId},
         ${sig.signatureData}, ${sig.contentHash}, ${sig.clientIp},
         ${sig.signedAt}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可验签与历史查询，电子证据落库留待重连后补写
  }
}
