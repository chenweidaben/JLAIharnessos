/**
 * 健澜AI原生医院操作系统OS — knowledge-platform/isolation/patientIsolation.ts
 *
 * 患者级隔离索引与越权审计（技术文档 3.3.2 患者级隔离索引 373–388 行、3.3.6 验收标准；
 * 差距矩阵 R-08 第 202 行、ADR-03 第 125 行；台账 S-13 第 1418 行「跨患者检索拒绝；越权事件入审计」）：
 * 相似病例患者级隔离索引结构、归档批量构建、IngestGuard 接入校验、分区强制过滤、
 * 越权阻断审计入链、阻断事件多维回查。
 *
 * 本切片为纯类型 + 纯函数 + 进程内存台账，离线闭环；不接 DB、不发起网络请求、不调用真实
 * LLM / 向量相似度；不改动既有 `src/knowledge-platform/types.ts`、`retrieval/hybrid.ts`、
 * S-11 lifecycle、S-12 citation、`src/security/audit/aiAudit.ts` 与既有 `src/knowledge/` 运行时。
 * 真实归档批量任务调度、向量打分、RBAC 会话解析、BFF 路由与前端页面归后续批次。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AiActor,
  AiAuditEvent,
  AiAuditQuery,
  AiAuditService,
  AiAuditEventInput,
  AiVersionSnapshot,
} from '@/security/audit/aiAudit.js';
import type { SourceProvenance } from '../types.js';

// ============================================================================
// 错误码常量
// ============================================================================

/** 必填 / 结构 / 规则校验未通过 */
export const ISO_ERROR_MISSING_FIELD = 'ISO-001';
/** 隔离索引规则非法（scope / builtBy / accessRule / 密级归属等） */
export const ISO_ERROR_INVALID_RULE = 'ISO-002';
/** 分区归属不一致或重复分区登记 */
export const ISO_ERROR_PARTITION_MISMATCH = 'ISO-003';
/** 脱敏要求未满足（deidentified 标记 / 身份标识残留） */
export const ISO_ERROR_DEIDENTIFICATION = 'ISO-004';
/** 非归档批量任务调用构建入口 */
export const ISO_ERROR_ARCHIVAL_ONLY = 'ISO-005';
/** 操作对象不存在 */
export const ISO_ERROR_NOT_FOUND = 'ISO-006';

// ============================================================================
// 类型契约（对齐 3.3.2 第 376–385 行原文）
// ============================================================================

/** 相似病例命中片段（仅历史已归档、经脱敏与授权的病例片段） */
export interface SimilarCaseChunk {
  chunkId: string;
  patientId: string;
  visitId?: string;
  excerpt: string;
  sectionTitle?: string;
  specialty?: string;
  /** 归档时间 ISO8601 */
  archivedAt: string;
  /** 脱敏完成标记；恒为 true，构造期校验不可改写 */
  deidentified: true;
  /** 授权使用范围角色清单 */
  authorizedScope: string[];
  provenance: SourceProvenance;
  conflictGroup?: string;
}

/** 访问规则：强制就诊 / 患者标识匹配，禁止跨患者召回，用途仅限相似病例 */
export interface SimilarCaseAccessRule {
  requireVisitMatch: true;
  allowedRoles: string[];
  purpose: 'similar-case-only';
}

/** 患者级隔离索引（独立于通用知识库，scope 恒为 patient-isolated） */
export interface SimilarCaseIndex {
  scope: 'patient-isolated';
  partitionKey: string;
  chunks: SimilarCaseChunk[];
  accessRule: SimilarCaseAccessRule;
  createdAt: string;
  /** 仅归档后批量任务可构建 */
  builtBy: 'archival-batch';
}

/** 隔离查询入参（角色由调用方传入，RBAC 会话真实解析归后续批次） */
export interface IsolationQuery {
  traceId: string;
  actor: AiActor;
  patientId: string;
  visitId?: string;
  roles: string[];
  purpose: string;
  agentId: string;
  agentVersion: string;
  versions: AiVersionSnapshot;
  queryText: string;
}

/** 隔离判定结论 */
export type IsolationReasonCode =
  | 'OK'
  | 'MISSING_PATIENT_ID'
  | 'VISIT_MISMATCH'
  | 'ROLE_FORBIDDEN'
  | 'PURPOSE_FORBIDDEN'
  | 'INDEX_NOT_FOUND'
  | 'CHUNK_OUTSIDE_PARTITION'
  | 'DEIDENTIFICATION_REQUIRED';

export interface IsolationVerdict {
  allowed: boolean;
  reasonCode: IsolationReasonCode;
  reason: string;
  hits: SimilarCaseChunk[];
  auditEventId?: string;
}

/** IngestGuard 接入校验结论（ADR-03：患者诊疗数据禁止进入向量库 / 通用知识库） */
export type IngestGuardReasonCode = 'OK' | 'PATIENT_DATA_BLOCKED';

export interface IngestGuardVerdict {
  allowed: boolean;
  reasonCode: IngestGuardReasonCode;
  reason: string;
  blockedFields: string[];
}

/** 待接入文档载荷（IngestGuard 校验对象；不进入通用知识库台账） */
export interface PatientDocumentPayload {
  title?: string;
  content?: string;
  patientId?: string;
  visitId?: string;
  medicalRecordNo?: string;
  patientScopeId?: string;
  partitionKey?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 常量与身份标识正则
// ============================================================================

/** 隔离索引固定场景标识（审计事件 scenario 口径） */
export const ISOLATION_SCENARIO = 'similar-case-isolation';
/** 隔离索引写路径（审计事件 writePath 口径） */
export const ISOLATION_WRITE_PATH = 'patient-isolation/query';
/** 隔离工具节点标识（审计 toolCalls 口径） */
export const ISOLATION_TOOL_ID = 'similar-case-query';

/** 患者标识污染字段清单（与 S-11 口径对齐，独立实现不反向依赖 lifecycle 模块） */
const PATIENT_IDENTITY_FIELDS = ['patientId', 'visitId', 'medicalRecordNo', 'patientScopeId', 'partitionKey'] as const;

/** 11 位手机号 */
const MOBILE_RE = /1[3-9]\d{9}/;
/** 18 位身份证号（末位 X/x） */
const ID_CARD_RE = /\d{17}[\dXx]/;
/** 「患者姓名:」前缀直填 */
const NAME_PREFIX_RE = /患者姓名[:：]/;

// ============================================================================
// 纯函数辅助
// ============================================================================

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

/** 检查片段是否残留原始身份标识，返回命中的标识类型说明 */
function detectIdentityLeak(excerpt: string): string | null {
  if (ID_CARD_RE.test(excerpt)) return '18 位身份证号';
  if (MOBILE_RE.test(excerpt)) return '11 位手机号';
  if (NAME_PREFIX_RE.test(excerpt)) return '「患者姓名:」前缀直填';
  return null;
}

// ============================================================================
// 索引校验纯函数
// ============================================================================

/**
 * 校验患者级隔离索引结构与归属；返回中文错误信息数组，空数组 = 通过。
 * 校验口径：scope / builtBy / accessRule 三字段 / partitionKey / 分区归属 / 脱敏标记 /
 * 归档日期 / 片段身份标识残留 / 来源名称。
 */
export function validateSimilarCaseIndex(index: SimilarCaseIndex): string[] {
  const errors: string[] = [];
  if (index.scope !== 'patient-isolated')
    errors.push(`[${ISO_ERROR_INVALID_RULE}] scope 必须为 'patient-isolated'，当前为 '${index.scope}'。`);
  if (index.builtBy !== 'archival-batch')
    errors.push(`[${ISO_ERROR_ARCHIVAL_ONLY}] builtBy 必须为 'archival-batch'，仅归档后批量任务可构建隔离索引。`);
  if (!isNonEmptyString(index.partitionKey))
    errors.push(`[${ISO_ERROR_MISSING_FIELD}] partitionKey 必须为非空字符串。`);

  const rule = index.accessRule;
  if (!rule || rule.requireVisitMatch !== true)
    errors.push(`[${ISO_ERROR_INVALID_RULE}] accessRule.requireVisitMatch 必须恒为 true。`);
  if (!rule || rule.purpose !== 'similar-case-only')
    errors.push(`[${ISO_ERROR_INVALID_RULE}] accessRule.purpose 必须为 'similar-case-only'。`);
  if (!rule || !Array.isArray(rule.allowedRoles) || rule.allowedRoles.length === 0)
    errors.push(`[${ISO_ERROR_INVALID_RULE}] accessRule.allowedRoles 必须为非空角色数组。`);

  if (!Array.isArray(index.chunks)) {
    errors.push(`[${ISO_ERROR_MISSING_FIELD}] chunks 必须为数组。`);
    return errors;
  }

  index.chunks.forEach((chunk, indexNo) => {
    const prefix = `第 ${indexNo + 1} 条片段（chunkId=${chunk.chunkId || '未填写'}）`;
    if (!isNonEmptyString(chunk.chunkId)) errors.push(`[${ISO_ERROR_MISSING_FIELD}] ${prefix} chunkId 必须为非空字符串。`);
    if (!isNonEmptyString(chunk.patientId)) {
      errors.push(`[${ISO_ERROR_MISSING_FIELD}] ${prefix} patientId 必须为非空字符串。`);
    } else if (chunk.patientId !== index.partitionKey) {
      errors.push(`[${ISO_ERROR_PARTITION_MISMATCH}] ${prefix} patientId 与分区键 ${index.partitionKey} 不一致，禁止跨分区入库。`);
    }
    if (chunk.deidentified !== true)
      errors.push(`[${ISO_ERROR_DEIDENTIFICATION}] ${prefix} deidentified 必须为 true，未脱敏片段禁止入隔离索引。`);
    if (!isNonEmptyString(chunk.archivedAt) || Number.isNaN(Date.parse(chunk.archivedAt)))
      errors.push(`[${ISO_ERROR_MISSING_FIELD}] ${prefix} archivedAt 必须为合法 ISO8601 日期。`);
    if (!isNonEmptyString(chunk.excerpt)) {
      errors.push(`[${ISO_ERROR_MISSING_FIELD}] ${prefix} excerpt 必须为非空片段文本。`);
    } else {
      const leak = detectIdentityLeak(chunk.excerpt);
      if (leak) errors.push(`[${ISO_ERROR_DEIDENTIFICATION}] ${prefix} excerpt 残留${leak}，脱敏不达标。`);
    }
    if (!chunk.provenance || !isNonEmptyString(chunk.provenance.sourceName))
      errors.push(`[${ISO_ERROR_MISSING_FIELD}] ${prefix} provenance.sourceName 必须为非空字符串。`);
  });

  return errors;
}

// ============================================================================
// IngestGuard 接入校验（ADR-03，纯函数不抛错、不写台账）
// ============================================================================

/**
 * 通用知识库 / 向量库接入校验：载荷携带患者标识字段即拒绝入库；
 * metadata 中携带同名键一并拦截。清洁元数据返回 allowed=true，供接入器调用方据此拒绝。
 */
export function assertNotPatientDocument(payload: PatientDocumentPayload): IngestGuardVerdict {
  const blockedFields: string[] = [];

  for (const field of PATIENT_IDENTITY_FIELDS) {
    const topLevel = payload[field];
    if (topLevel !== undefined && topLevel !== null && `${topLevel}`.trim() !== '') {
      blockedFields.push(field);
    }
    const metaValue = payload.metadata?.[field];
    if (metaValue !== undefined && metaValue !== null && `${metaValue}`.trim() !== '') {
      blockedFields.push(`metadata.${field}`);
    }
  }

  if (blockedFields.length > 0) {
    return {
      allowed: false,
      reasonCode: 'PATIENT_DATA_BLOCKED',
      reason: `[${ISO_ERROR_MISSING_FIELD}] 患者诊疗数据禁止进入向量库 / 通用知识库（ADR-03），拦截字段：${blockedFields.join('、')}。`,
      blockedFields,
    };
  }
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: '未携带患者标识字段，可进入通用知识库接入流程。',
    blockedFields: [],
  };
}

// ============================================================================
// 归档批量构建纯函数
// ============================================================================

/**
 * 归档后批量任务构建隔离索引：全部 chunk 归属同一 partitionKey；createdAt 取当前时间；
 * builtBy='archival-batch'；返回深拷贝。跨分区归属或规则校验不通过抛错。
 */
export function buildArchivalIndex(
  records: SimilarCaseChunk[],
  meta: { partitionKey: string; allowedRoles: string[]; operator: string },
): SimilarCaseIndex {
  if (!isNonEmptyString(meta.partitionKey))
    throw new Error(`[${ISO_ERROR_MISSING_FIELD}] partitionKey 必须为非空字符串。`);
  if (!Array.isArray(meta.allowedRoles) || meta.allowedRoles.length === 0)
    throw new Error(`[${ISO_ERROR_INVALID_RULE}] allowedRoles 必须为非空角色数组。`);

  for (const record of records) {
    if (record.patientId !== meta.partitionKey)
      throw new Error(
        `[${ISO_ERROR_PARTITION_MISMATCH}] 片段 ${record.chunkId} 归属患者 ${record.patientId} 与分区键 ${meta.partitionKey} 不一致，禁止跨分区构建。`,
      );
  }

  const index: SimilarCaseIndex = {
    scope: 'patient-isolated',
    partitionKey: meta.partitionKey,
    chunks: deepClone(records),
    accessRule: {
      requireVisitMatch: true,
      allowedRoles: [...meta.allowedRoles],
      purpose: 'similar-case-only',
    },
    createdAt: new Date().toISOString(),
    builtBy: 'archival-batch',
  };

  const errors = validateSimilarCaseIndex(index);
  if (errors.length > 0)
    throw new Error(`[${ISO_ERROR_INVALID_RULE}] 隔离索引构建校验未通过：${errors.join('；')}`);

  return deepClone(index);
}

// ============================================================================
// 隔离服务（进程内存 Map，深拷贝隔离）
// ============================================================================

export class PatientIsolationService {
  private readonly indexes = new Map<string, SimilarCaseIndex>();
  private readonly auditService?: AiAuditService;

  constructor(options?: { auditService?: AiAuditService }) {
    this.auditService = options?.auditService;
  }

  /** 登记隔离索引；校验失败抛 ISO-002；重复分区键拒绝 ISO-003；入库深拷贝 */
  registerIndex(index: SimilarCaseIndex): SimilarCaseIndex {
    const errors = validateSimilarCaseIndex(index);
    if (errors.length > 0) throw new Error(`[${ISO_ERROR_INVALID_RULE}] 隔离索引校验未通过：${errors.join('；')}`);
    if (this.indexes.has(index.partitionKey))
      throw new Error(`[${ISO_ERROR_PARTITION_MISMATCH}] 分区「${index.partitionKey}」索引已存在，禁止重复登记。`);
    this.indexes.set(index.partitionKey, deepClone(index));
    return deepClone(index);
  }

  /** 按分区键回读索引深拷贝；不存在返回 undefined */
  getIndex(partitionKey: string): SimilarCaseIndex | undefined {
    const index = this.indexes.get(partitionKey);
    return index ? deepClone(index) : undefined;
  }

  /** 进程内存台账重置（测试专用；审计事件台账由 S-08 单例配合重置） */
  reset(): void {
    this.indexes.clear();
  }

  /**
   * 相似病例隔离查询：强制患者 / 角色 / 用途 / 就诊标识过滤；阻断分支不返回其他分区任何片段。
   * 判定顺序：患者标识 → 用途 → 分区存在性 → 角色交集 → 就诊匹配 → 分区归属兜底 → 放行。
   */
  querySimilarCases(query: IsolationQuery): IsolationVerdict {
    // 1. 患者标识必填
    if (!isNonEmptyString(query.patientId)) {
      return this.blocked(query, 'MISSING_PATIENT_ID', '查询缺少 patientId，相似病例检索必须携带患者标识。', []);
    }
    // 2. 用途限定
    if (query.purpose !== 'similar-case-only') {
      return this.blocked(query, 'PURPOSE_FORBIDDEN', `用途「${query.purpose}」不属于相似病例专属用途，禁止调用隔离索引。`, []);
    }
    // 3. 分区存在性
    const index = this.indexes.get(query.patientId);
    if (!index) {
      return this.blocked(query, 'INDEX_NOT_FOUND', `患者 ${query.patientId} 无已归档隔离索引，禁止跨患者检索。`, []);
    }
    // 4. 角色交集
    const allowedRoles = new Set(index.accessRule.allowedRoles);
    const roleHit = (query.roles ?? []).some((role) => allowedRoles.has(role));
    if (!roleHit) {
      return this.blocked(query, 'ROLE_FORBIDDEN', `当前角色 ${(query.roles ?? []).join('、') || '（空）'} 不在授权角色清单内。`, []);
    }
    // 5. 就诊标识匹配（提供 visitId 时强制相等）
    if (isNonEmptyString(query.visitId)) {
      const matched = index.chunks.filter((chunk) => chunk.visitId === query.visitId);
      if (matched.length === 0) {
        return this.blocked(query, 'VISIT_MISMATCH', `就诊标识 ${query.visitId} 在本分区内无匹配片段，禁止跨就诊召回。`, []);
      }
    }
    // 6. 分区归属兜底（构造期已约束，运行时再校验防止台账被旁路改写）
    const outside = index.chunks.filter((chunk) => chunk.patientId !== query.patientId);
    if (outside.length > 0) {
      return this.blocked(
        query,
        'CHUNK_OUTSIDE_PARTITION',
        `分区 ${query.patientId} 内检测到跨分区片段 ${outside.map((c) => c.chunkId).join('、')}，已阻断返回。`,
        [],
      );
    }

    // 7. 放行：返回分区内匹配片段深拷贝；不做相似度打分（真实向量打分归后续批次）
    const eligible = query.visitId
      ? index.chunks.filter((chunk) => chunk.visitId === query.visitId)
      : index.chunks;
    const hits = eligible.map((chunk) => deepClone(chunk));

    const auditEventId = this.recordAudit(query, {
      guardLevel: 'PASS',
      result: 'success',
      outputSummary: `返回相似病例命中 ${hits.length} 条；不落片段原文。`,
      evidence: `allowed: ${hits.length} hits`,
    });

    return {
      allowed: true,
      reasonCode: 'OK',
      reason: `隔离校验通过，返回 ${hits.length} 条相似病例片段。`,
      hits,
      auditEventId,
    };
  }

  /** 阻断事件回查：限定相似病例隔离场景与 BLOCK 级别；透传审计服务多维过滤 */
  listBlockedQueries(filter?: { patientId?: string; traceId?: string; from?: string; to?: string }): AiAuditEvent[] {
    if (!this.auditService) return [];
    const auditQuery: AiAuditQuery = {
      scenario: ISOLATION_SCENARIO,
      guardLevel: 'BLOCK',
      patientId: filter?.patientId,
      traceId: filter?.traceId,
      from: filter?.from,
      to: filter?.to,
    };
    return this.auditService.query(auditQuery);
  }

  // --------------------------------------------------------------------------
  // 内部辅助
  // --------------------------------------------------------------------------

  private blocked(
    query: IsolationQuery,
    reasonCode: IsolationReasonCode,
    reason: string,
    hits: SimilarCaseChunk[],
  ): IsolationVerdict {
    const auditEventId = this.recordAudit(query, {
      guardLevel: 'BLOCK',
      result: 'blocked',
      outputSummary: '无命中返回；阻断事件入审计链。',
      evidence: `${reasonCode}: ${reason}`,
    });
    return {
      allowed: false,
      reasonCode,
      reason,
      hits: deepClone(hits),
      auditEventId,
    };
  }

  private recordAudit(
    query: IsolationQuery,
    options: { guardLevel: 'PASS' | 'BLOCK'; result: 'success' | 'blocked'; outputSummary: string; evidence: string },
  ): string | undefined {
    if (!this.auditService) return undefined;
    const start = Date.now();
    try {
      const input: AiAuditEventInput = {
        traceId: query.traceId,
        actor: query.actor,
        agentId: query.agentId,
        agentVersion: query.agentVersion,
        scenario: ISOLATION_SCENARIO,
        patientId: query.patientId || undefined,
        visitId: query.visitId,
        department: query.actor.department,
        versions: query.versions,
        inputSummary: `相似病例隔离查询（用途：${query.purpose}；角色：${query.roles.join('、') || '（空）'}）。`,
        outputSummary: options.outputSummary,
        citations: [],
        elapsedMs: Date.now() - start,
        tokenUsage: { input: 0, output: 0 },
        guardLevel: options.guardLevel,
        humanAction: 'pending',
        toolCalls: [
          {
            toolId: ISOLATION_TOOL_ID,
            operation: 'query-similar-cases',
            purpose: 'similar-case-only',
            riskLevel: 'read-only',
            result: options.result,
            durationMs: Date.now() - start,
          },
        ],
        writePath: ISOLATION_WRITE_PATH,
        evidence: options.evidence,
      };
      const event = this.auditService.record(input);
      return event.eventId;
    } catch {
      // 审计旁路增强：写入失败不抛出、不阻断隔离判定主流程（与 S-08 桥接口径一致）
      return undefined;
    }
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _service: PatientIsolationService | null = null;

/** 获取进程级患者隔离服务单例；options 仅在首次创建时生效 */
export function getPatientIsolationService(options?: { auditService?: AiAuditService }): PatientIsolationService {
  if (!_service) _service = new PatientIsolationService(options);
  return _service;
}

/** 测试专用：重置模块级单例；审计事件台账由 `_resetAiAuditService()` 配合重置 */
export function _resetPatientIsolationService(): void {
  _service = null;
}
