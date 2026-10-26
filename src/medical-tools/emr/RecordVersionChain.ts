/**
 * 健澜科技 jlmedaios - 病历正文 append-only 版本链守卫（M610）
 *
 * 对应《电子病历应用管理规范（试行）》《病历书写基本规范》《电子病历系统应用水平分级评价》
 * 对「病历修改留痕、版本可追溯、不可物理覆盖、定稿锁定」的要求，补齐合规蓝图缺口 #2
 * 「病历正文 append-only 写入层拦截 + 版本链」在领域层的空白。
 *
 * 设计原则：
 *  - 纯领域纯函数，不依赖数据库、消息队列或外部凭证，可在本机闭环单测；
 *  - 不可变：修订只追加新版本对象，绝不改写既有版本对象；
 *  - 链式指纹：每条版本绑定 prevVersionId 指针与内容 SHA-256 指纹，整链可重算校验；
 *  - 状态守卫：锁定版本、已签名终稿禁止再修订；空正文拒绝写入。
 *
 * 生产化衔接：DB 层 append-only 触发器、WORM 存储与哈希链存证在后续生产化专项接入，
 * 本模块提供应用层领域契约与校验基准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as crypto from 'node:crypto';

/* ==================== 类型定义 ==================== */

/** 版本动作：建档 / 追加修订 / 锁定 / 签名定稿 */
export type RecordVersionAction = 'CREATE' | 'APPEND_REVISION' | 'LOCK' | 'SIGN';

/** 版本状态：草稿 / 生效中 / 已锁定 / 已签名定稿 */
export type RecordStatus = 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'SIGNED_FINAL';

/** 完整性错误码（与 BFF 错误响应映射对齐） */
export enum RecordIntegrityCode {
  EMPTY_CONTENT = 'EMPTY_CONTENT',
  VERSION_OUT_OF_ORDER = 'VERSION_OUT_OF_ORDER',
  CHAIN_BROKEN = 'CHAIN_BROKEN',
  HASH_MISMATCH = 'HASH_MISMATCH',
  EDIT_LOCKED = 'EDIT_LOCKED',
  SIGNED_FINAL = 'SIGNED_FINAL',
  PHYSICAL_OVERWRITE = 'PHYSICAL_OVERWRITE',
  UNKNOWN_VERSION = 'UNKNOWN_VERSION',
}

/** 病历完整性领域错误 */
export class RecordIntegrityError extends Error {
  public readonly code: RecordIntegrityCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: RecordIntegrityCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'RecordIntegrityError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, RecordIntegrityError.prototype);
  }
}

/** 一条病历版本（领域内存态，含正文；对外接口出参时应剥离正文，仅回传摘要与指纹） */
export interface RecordVersion {
  /** 版本唯一标识 */
  versionId: string;
  /** 病历号 / 文书标识 */
  recordId: string;
  /** 版本号，从 1 起单调递增 */
  versionNo: number;
  /** 前一版本标识；首版为创世哈希 */
  prevVersionId: string;
  /** 病历正文（领域态保留，便于整链重算校验） */
  content: string;
  /** 内容 SHA-256 指纹 */
  contentHash: string;
  /** 正文摘要（截断，用于列表展示） */
  contentSummary: string;
  /** 操作人 ID */
  editorId: string;
  /** 操作人姓名 */
  editorName: string;
  /** 操作时间（ISO 8601） */
  editedAt: string;
  /** 版本动作 */
  action: RecordVersionAction;
  /** 修订说明 / 修改痕迹 */
  changeSummary: string;
  /** 版本状态 */
  status: RecordStatus;
  /** 签名值（定稿签名后回填） */
  signature?: string;
}

/** 建档 / 修订输入 */
export interface RecordRevisionInput {
  content: string;
  editorId: string;
  editorName: string;
  changeSummary: string;
  editedAt?: string;
}

/** 整链校验结果 */
export interface ChainVerifyResult {
  valid: boolean;
  verifiedCount: number;
  firstInvalidIndex?: number;
  code?: RecordIntegrityCode;
  reason?: string;
}

/* ==================== 常量与工具 ==================== */

/** 创世版本标识（与审计哈希链口径一致：64 个 0） */
export const GENESIS_VERSION_ID = '0'.repeat(64);

/** 内容摘要最大长度 */
const SUMMARY_MAX = 80;

function nowIso(): string {
  return new Date().toISOString();
}

/** 确定性键排序序列化（与 security/audit/LogIntegrity 口径一致） */
function canonicalJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, Object.keys(value).sort());
}

function summaryOf(content: string): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > SUMMARY_MAX ? `${flat.slice(0, SUMMARY_MAX)}…` : flat;
}

function assertNonEmpty(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new RecordIntegrityError(RecordIntegrityCode.EMPTY_CONTENT, '病历正文不能为空');
  }
}

function assertRecordId(recordId: string): void {
  if (!recordId || recordId.trim().length === 0) {
    throw new RecordIntegrityError(RecordIntegrityCode.UNKNOWN_VERSION, '病历号不能为空');
  }
}

function newVersionId(recordId: string, versionNo: number): string {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `ver-${recordId}-${versionNo}-${suffix}`;
}

/* ==================== 内容指纹 ==================== */

/**
 * 计算版本内容指纹（SHA-256）。
 * 指纹输入不含 contentHash 自身（避免自引用），绑定病历号、版本号、前序指针、正文、操作人与时间，
 * 保证任一环节被改动都会导致指纹不一致。
 */
export function hashRecordContent(params: {
  recordId: string;
  versionNo: number;
  prevVersionId: string;
  content: string;
  editorId: string;
  editedAt: string;
}): string {
  const digest = crypto.createHash('sha256');
  digest.update(params.prevVersionId);
  digest.update(
    canonicalJson({
      recordId: params.recordId,
      versionNo: params.versionNo,
      content: params.content,
      editorId: params.editorId,
      editedAt: params.editedAt,
    }),
  );
  return digest.digest('hex');
}

/* ==================== 版本构建（append-only） ==================== */

/**
 * 建档：生成首版版本链起点。
 * - prevVersionId = 创世哈希；versionNo = 1；状态 ACTIVE；动作 CREATE。
 * - 空正文直接拒绝。
 */
export function buildCreateVersion(recordId: string, input: RecordRevisionInput): RecordVersion {
  assertRecordId(recordId);
  assertNonEmpty(input.content);
  const editedAt = input.editedAt ?? nowIso();
  const versionNo = 1;
  const prevVersionId = GENESIS_VERSION_ID;
  const versionId = newVersionId(recordId, versionNo);
  const contentHash = hashRecordContent({
    recordId,
    versionNo,
    prevVersionId,
    content: input.content,
    editorId: input.editorId,
    editedAt,
  });

  return {
    versionId,
    recordId,
    versionNo,
    prevVersionId,
    content: input.content,
    contentHash,
    contentSummary: summaryOf(input.content),
    editorId: input.editorId,
    editorName: input.editorName,
    editedAt,
    action: 'CREATE',
    changeSummary: input.changeSummary.trim() || '首次建档',
    status: 'ACTIVE',
  };
}

/**
 * 追加修订：在当前版本之后生成新版本（append-only）。
 * - 不修改 current 对象（不可变）；新版本 versionNo = current.versionNo + 1；
 * - prevVersionId 指向 current.versionId；动作 APPEND_REVISION；状态继承 ACTIVE；
 * - 锁定版本 / 已签名终稿 / 空正文一律拒绝。
 */
export function buildRevisionVersion(current: RecordVersion, input: RecordRevisionInput): RecordVersion {
  if (!current) {
    throw new RecordIntegrityError(RecordIntegrityCode.UNKNOWN_VERSION, '目标版本不存在');
  }
  if (current.status === 'LOCKED') {
    throw new RecordIntegrityError(RecordIntegrityCode.EDIT_LOCKED, '病历已锁定，禁止追加修订', {
      versionId: current.versionId,
    });
  }
  if (current.status === 'SIGNED_FINAL') {
    throw new RecordIntegrityError(RecordIntegrityCode.SIGNED_FINAL, '病历已签名定稿，禁止追加修订', {
      versionId: current.versionId,
    });
  }
  assertNonEmpty(input.content);

  const editedAt = input.editedAt ?? nowIso();
  const versionNo = current.versionNo + 1;
  const prevVersionId = current.versionId;
  const versionId = newVersionId(current.recordId, versionNo);
  const contentHash = hashRecordContent({
    recordId: current.recordId,
    versionNo,
    prevVersionId,
    content: input.content,
    editorId: input.editorId,
    editedAt,
  });

  return {
    versionId,
    recordId: current.recordId,
    versionNo,
    prevVersionId,
    content: input.content,
    contentHash,
    contentSummary: summaryOf(input.content),
    editorId: input.editorId,
    editorName: input.editorName,
    editedAt,
    action: 'APPEND_REVISION',
    changeSummary: input.changeSummary.trim() || '补充修订',
    status: 'ACTIVE',
  };
}

/* ==================== 状态迁移 ==================== */

/** 锁定版本：定稿前的只读态；已锁定或已签名定稿不可重复迁移。返回新对象，不改原版本。 */
export function lockVersion(version: RecordVersion, operatorId: string): RecordVersion {
  if (!version) throw new RecordIntegrityError(RecordIntegrityCode.UNKNOWN_VERSION, '目标版本不存在');
  if (version.status === 'SIGNED_FINAL') {
    throw new RecordIntegrityError(RecordIntegrityCode.SIGNED_FINAL, '已签名定稿不可再锁定', {
      versionId: version.versionId,
    });
  }
  if (version.status === 'LOCKED') {
    throw new RecordIntegrityError(RecordIntegrityCode.EDIT_LOCKED, '版本已处于锁定状态', {
      versionId: version.versionId,
    });
  }
  return {
    ...version,
    status: 'LOCKED',
    action: 'LOCK',
    editorId: operatorId,
    editedAt: nowIso(),
  };
}

/** 签名定稿：终稿只读；签名值非空；返回新对象，不改原版本。 */
export function signVersion(version: RecordVersion, operatorId: string, signature: string): RecordVersion {
  if (!version) throw new RecordIntegrityError(RecordIntegrityCode.UNKNOWN_VERSION, '目标版本不存在');
  if (!signature || signature.trim().length === 0) {
    throw new RecordIntegrityError(RecordIntegrityCode.EMPTY_CONTENT, '签名值不能为空');
  }
  if (version.status === 'SIGNED_FINAL') {
    throw new RecordIntegrityError(RecordIntegrityCode.SIGNED_FINAL, '版本已签名定稿', {
      versionId: version.versionId,
    });
  }
  return {
    ...version,
    status: 'SIGNED_FINAL',
    action: 'SIGN',
    editorId: operatorId,
    editedAt: nowIso(),
    signature: signature.trim(),
  };
}

/* ==================== 链校验与物理覆盖拦截 ==================== */

/**
 * 整链完整性校验：按版本号升序逐条核对
 *  - 首版前序指针为创世哈希；
 *  - 每条 prevVersionId 指向前一条 versionId（链不断裂）；
 *  - versionNo 从 1 起严格连续递增、无重复；
 *  - 重算内容指纹与记录指纹一致（历史正文被篡改即判 HASH_MISMATCH）。
 */
export function verifyVersionChain(versions: RecordVersion[]): ChainVerifyResult {
  if (!versions || versions.length === 0) {
    return { valid: true, verifiedCount: 0 };
  }
  const sorted = [...versions].sort((a, b) => a.versionNo - b.versionNo);

  let expectedPrev = GENESIS_VERSION_ID;
  let expectedNo = 1;

  for (let i = 0; i < sorted.length; i++) {
    const v = sorted[i];

    if (v.versionNo !== expectedNo) {
      return {
        valid: false,
        verifiedCount: i,
        firstInvalidIndex: i,
        code: RecordIntegrityCode.VERSION_OUT_OF_ORDER,
        reason: `版本号非连续递增：期望第 ${expectedNo} 版，实际为第 ${v.versionNo} 版`,
      };
    }

    if (v.prevVersionId !== expectedPrev) {
      return {
        valid: false,
        verifiedCount: i,
        firstInvalidIndex: i,
        code: RecordIntegrityCode.CHAIN_BROKEN,
        reason: `第 ${v.versionNo} 版前序指针断裂：期望 ${expectedPrev.slice(0, 12)}…，实际 ${v.prevVersionId.slice(0, 12)}…`,
      };
    }

    const recomputed = hashRecordContent({
      recordId: v.recordId,
      versionNo: v.versionNo,
      prevVersionId: v.prevVersionId,
      content: v.content,
      editorId: v.editorId,
      editedAt: v.editedAt,
    });
    if (recomputed !== v.contentHash) {
      return {
        valid: false,
        verifiedCount: i,
        firstInvalidIndex: i,
        code: RecordIntegrityCode.HASH_MISMATCH,
        reason: `第 ${v.versionNo} 版内容指纹不一致，正文可能被篡改`,
      };
    }

    expectedPrev = v.versionId;
    expectedNo += 1;
  }

  return { valid: true, verifiedCount: sorted.length };
}

/**
 * 物理覆盖拦截：业务层试图回写某一既有版本正文时调用。
 * 若待写入正文对应指纹与既有版本指纹不一致，即判定为物理改写，直接抛 PHYSICAL_OVERWRITE；
 * 合规做法是通过 buildRevisionVersion 追加新版本，而不是覆盖旧版本。
 */
export function assertNotPhysicalOverwrite(
  existing: RecordVersion[],
  targetVersionId: string,
  incomingContent: string,
): void {
  if (!existing || existing.length === 0) {
    throw new RecordIntegrityError(RecordIntegrityCode.UNKNOWN_VERSION, '版本链为空，不存在可覆盖的版本');
  }
  const target = existing.find((v) => v.versionId === targetVersionId);
  if (!target) {
    throw new RecordIntegrityError(RecordIntegrityCode.UNKNOWN_VERSION, '目标版本不存在', { targetVersionId });
  }
  const incomingHash = hashRecordContent({
    recordId: target.recordId,
    versionNo: target.versionNo,
    prevVersionId: target.prevVersionId,
    content: incomingContent,
    editorId: target.editorId,
    editedAt: target.editedAt,
  });
  if (incomingHash !== target.contentHash) {
    throw new RecordIntegrityError(
      RecordIntegrityCode.PHYSICAL_OVERWRITE,
      '禁止物理改写既有版本正文；修订只能追加新版本',
      { versionId: target.versionId, versionNo: target.versionNo },
    );
  }
}
