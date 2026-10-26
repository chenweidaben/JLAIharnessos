/**
 * 健澜AI原生医院操作系统OS — knowledge-platform/lifecycle/knowledgeRegistry.ts
 *
 * RAG 知识生命周期基础（技术文档 3.3.2 知识域与知识块模型扩展、3.3.4 知识生命周期、
 * 3.3.6 验收标准；差距矩阵 R-02/R-03/R-04/R-05/R-09；台账 S-11「缺字段拦截；过期不召回」）：
 * 六知识域台账、元数据六要素入库拦截、准入签字留痕、生效 / 失效日期、冲突分组与版本链、
 * 季度评审周期、历史版本快照检索。
 *
 * 本切片为进程内存台账 + 纯函数校验，离线闭环；不接 DB、不发起网络请求、不调用真实
 * Embedding；不改动既有 `src/knowledge-platform/types.ts`、`hybrid.ts`、`VersionManager.ts`
 * 与 `src/knowledge` 运行时及既有知识测试断言。患者级隔离索引归 S-13，本切片类型模型上
 * 固定 `patientScope='none'`，拒绝携带患者标识字段的条目入库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 错误码常量
// ============================================================================

/** 元数据必填 / 枚举 / 结构校验未通过 */
export const KB_ERROR_VALIDATION = 'KB-001';
/** 重复 id */
export const KB_ERROR_DUPLICATE_ID = 'KB-002';
/** 状态机非法迁移 */
export const KB_ERROR_INVALID_TRANSITION = 'KB-003';
/** 条目六要素缺项入库拦截 */
export const KB_ERROR_MISSING_ELEMENT = 'KB-004';
/** 患者标识字段污染 / patientScope 非法 */
export const KB_ERROR_PATIENT_SCOPE = 'KB-005';
/** 操作对象不存在 */
export const KB_ERROR_NOT_FOUND = 'KB-006';

// ============================================================================
// 类型契约（对齐 3.3.2 / 3.3.4 原文，字段只增不删，不回改既有接口）
// ============================================================================

/** 六知识域（字面量不得增减） */
export type KnowledgeDomain =
  | 'writing-standard' // 病历书写规范
  | 'clinical-guide' // 临床诊疗指南 / 共识 / 路径 / 用药 / 检验检查适用 / 危急值
  | 'hospital-policy' // 医院管理制度
  | 'specialty' // 专科特色
  | 'data-standard' // 数据标准字典（ICD-10 / ICD-9-CM-3 / 术语 / 药品 / 检验检查 / 科室人员 / 手术分级）
  | 'operations-faq'; // 运营问答

/** 密级四级 */
export type SecurityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

/** 知识资产状态机状态 */
export type KnowledgeStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'expired'
  | 'superseded'
  | 'deprecated';

/** 评审结论：继续有效 / 修订 / 停用 */
export type KnowledgeReviewConclusion = 'continue' | 'revise' | 'retire';

/** 准入审批结论 */
export type KnowledgeReviewResult = 'approved' | 'rejected';

/** 来源溯源引用（3.3.2 origin 扩展字段） */
export interface ProvenanceRef {
  /** 来源标识（规范库 id 或自建来源 id） */
  sourceId: string;
  /** 来源名称（中文） */
  sourceName: string;
  /** 发布机构 */
  publisher?: string;
  /** 来源版本 / 发布批次 */
  version?: string;
  /** 原始 URL */
  url?: string;
  /** 获取 / 更新时间 ISO8601 */
  fetchedAt: string;
  /** 校验和（sha256），完整性校验 */
  checksum?: string;
}

/** 变更记录（版本链留痕） */
export interface KnowledgeChangeEntry {
  versionRef: string;
  changedAt: string;
  operator: string;
  summary: string;
  parentVersionRef?: string;
  reviewResult?: KnowledgeReviewResult;
}

/** 评审记录（季度评审归档） */
export interface KnowledgeReviewEntry {
  reviewedAt: string;
  reviewer: string;
  conclusion: KnowledgeReviewConclusion;
  note?: string;
  evidenceRef?: string;
}

/** 知识库台账元数据（3.3.2 KnowledgeBase 扩展字段） */
export interface KnowledgeBaseMeta {
  id: string;
  domain: KnowledgeDomain;
  name: string;
  description: string;
  /** 归属科室 / 部门 */
  ownerDepartment: string;
  owner: string;
  /** 准入审核责任人（签字留痕） */
  approver?: string;
  approvedAt?: string;
  /** 季度评审周期（月），默认 3 */
  reviewCycleMonths: number;
  reviewDueAt?: string;
  /** 知识中台不放患者诊疗数据；患者级索引单独建模（S-13） */
  patientScope: 'none';
  tags: string[];
  specialty: string[];
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
  /** 知识版本号，四维留痕使用 */
  versionRef: string;
  changeLog: KnowledgeChangeEntry[];
  reviewHistory: KnowledgeReviewEntry[];
}

/** 知识条目（文档 / 条款 / 标准块，3.3.2 RawDocument / KnowledgeChunk 扩展字段） */
export interface KnowledgeEntry {
  id: string;
  knowledgeBaseId: string;
  title: string;
  /** 章节标题（六要素之章节） */
  sectionTitle: string;
  /** 页码 / 原文位置引用 */
  pageRef?: string;
  specialty: string[];
  securityLevel: SecurityLevel;
  owner: string;
  approver?: string;
  approvedAt?: string;
  /** 生效日期 ISO8601；到达后进入可检索 */
  effectiveDate: string;
  /** 失效日期 ISO8601；过期转历史不参与召回 */
  expireDate?: string;
  origin: ProvenanceRef;
  /** 冲突检测分组（同一主题不同版本 / 来源） */
  conflictGroup?: string;
  /** 知识版本号，四维留痕使用 */
  versionRef: string;
  content: string;
  status: KnowledgeStatus;
  changeLog: KnowledgeChangeEntry[];
  reviewHistory: KnowledgeReviewEntry[];
  /** 被哪个新版本替代（版本链） */
  supersededBy?: string;
  updatedAt?: string;
  patientScope: 'none';
}

/** 准入申请要素：来源 / 专科 / 适用范围 / 密级 / 用途 */
export interface KnowledgeAdmissionRequest {
  base: KnowledgeBaseMeta | KnowledgeEntry;
  submitter: string;
  /** 适用范围说明 */
  scopeSummary: string;
  securityLevel: SecurityLevel;
  intendedUse: string;
}

/** 准入留痕台账记录 */
export interface AdmissionTrailRecord {
  id: string;
  kind: 'base' | 'entry';
  submittedBy: string;
  approver?: string;
  approvedAt?: string;
  scopeSummary: string;
  intendedUse: string;
  securityLevel: SecurityLevel;
  status: KnowledgeStatus;
  submittedAt: string;
  /** 关联知识域（条目经所属知识库映射），供留痕按域检索 */
  domain?: KnowledgeDomain;
}

/** 已解析台账对象（判别联合，供状态机按 kind 窄化字段） */
type ResolvedTarget =
  | { kind: 'base'; record: KnowledgeBaseMeta }
  | { kind: 'entry'; record: KnowledgeEntry };

/** 召回清单过滤器（六域 / 专科 / 密级 / 科室 / 知识库精确过滤） */
export interface RetrievalFilter {
  domain?: KnowledgeDomain;
  specialty?: string;
  securityLevel?: SecurityLevel;
  ownerDepartment?: string;
  knowledgeBaseId?: string;
}

// ============================================================================
// 枚举与状态机常量
// ============================================================================

const KNOWLEDGE_DOMAINS: readonly KnowledgeDomain[] = [
  'writing-standard',
  'clinical-guide',
  'hospital-policy',
  'specialty',
  'data-standard',
  'operations-faq',
];

const SECURITY_LEVELS: readonly SecurityLevel[] = ['public', 'internal', 'confidential', 'restricted'];

const KNOWLEDGE_STATUSES: readonly KnowledgeStatus[] = [
  'draft',
  'pending_review',
  'approved',
  'expired',
  'superseded',
  'deprecated',
];

/** 合法出边；expired / superseded / deprecated 为终态 */
const STATUS_TRANSITIONS: Record<KnowledgeStatus, KnowledgeStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['approved', 'draft'],
  approved: ['deprecated', 'superseded', 'expired'],
  expired: [],
  superseded: [],
  deprecated: [],
};

/** 患者标识污染字段名（接入校验 ADR-03 前置类型约束，S-13 独立建模） */
const FORBIDDEN_PATIENT_FIELDS = ['patientId', 'visitId', 'partitionKey', 'patientScopeId', 'medicalRecordNo'];

// ============================================================================
// 纯函数辅助
// ============================================================================

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`[${KB_ERROR_VALIDATION}] 时间格式非法：${iso}`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function transitionHint(from: KnowledgeStatus): string {
  const targets = STATUS_TRANSITIONS[from];
  return targets.length > 0 ? `合法出边：${from} → ${targets.join(' / ')}` : `${from} 为终态，不可再迁移`;
}

// ============================================================================
// 校验纯函数
// ============================================================================

/** 校验知识库台账元数据，返回错误信息数组（空数组 = 通过） */
export function validateKnowledgeBaseMeta(meta: unknown): string[] {
  const errors: string[] = [];
  if (typeof meta !== 'object' || meta === null) return ['知识库台账元数据必须为对象'];
  const m = meta as Record<string, unknown>;

  for (const field of ['id', 'name', 'description', 'ownerDepartment', 'owner', 'versionRef'] as const) {
    if (!isNonEmptyString(m[field])) errors.push(`[${KB_ERROR_VALIDATION}] 知识库 ${field} 必须为非空字符串`);
  }
  if (!KNOWLEDGE_DOMAINS.includes(m.domain as KnowledgeDomain))
    errors.push(`[${KB_ERROR_VALIDATION}] domain 必须为六知识域之一：${KNOWLEDGE_DOMAINS.join(' / ')}`);
  if (!isStringArray(m.tags)) errors.push(`[${KB_ERROR_VALIDATION}] tags 必须为字符串数组`);
  if (!isStringArray(m.specialty) || (m.specialty as string[]).length === 0)
    errors.push(`[${KB_ERROR_VALIDATION}] specialty 必须为非空专科标签数组`);
  if (m.patientScope !== 'none')
    errors.push(`[${KB_ERROR_PATIENT_SCOPE}] patientScope 必须固定为 'none'，患者级索引归 S-13 独立建模`);
  if (!KNOWLEDGE_STATUSES.includes(m.status as KnowledgeStatus))
    errors.push(`[${KB_ERROR_VALIDATION}] status 必须为知识状态机合法状态`);
  if (typeof m.reviewCycleMonths !== 'number' || m.reviewCycleMonths < 1)
    errors.push(`[${KB_ERROR_VALIDATION}] reviewCycleMonths 必须为不小于 1 的数值`);
  if (m.status === 'approved' && (!isNonEmptyString(m.approver as string) || !isNonEmptyString(m.approvedAt as string)))
    errors.push(`[${KB_ERROR_VALIDATION}] approved 状态知识库必须有 approver 与 approvedAt`);

  return errors;
}

/** 校验知识条目六要素与结构，返回错误信息数组（空数组 = 通过） */
export function validateKnowledgeEntry(entry: unknown, lookupBaseOwnerDepartment?: string): string[] {
  const errors: string[] = [];
  if (typeof entry !== 'object' || entry === null) return ['知识条目必须为对象'];
  const e = entry as Record<string, unknown>;

  // 患者标识污染拦截（接入校验 ADR-03 前置类型约束）
  for (const field of FORBIDDEN_PATIENT_FIELDS) {
    if (field === 'patientScope') continue;
    if (e[field] !== undefined) errors.push(`[${KB_ERROR_PATIENT_SCOPE}] 条目禁止携带患者标识字段 ${field}，患者级索引归 S-13 独立建模`);
  }
  if (e.patientScope !== 'none')
    errors.push(`[${KB_ERROR_PATIENT_SCOPE}] patientScope 必须固定为 'none'`);

  // 六要素逐项拦截
  const origin = e.origin as Record<string, unknown> | undefined;
  // 1. 来源：sourceId / sourceName / fetchedAt
  if (!origin || !isNonEmptyString(origin.sourceId as string))
    errors.push(`[${KB_ERROR_MISSING_ELEMENT}] 六要素缺失「来源」：origin.sourceId 必填`);
  if (!origin || !isNonEmptyString(origin.sourceName as string))
    errors.push(`[${KB_ERROR_MISSING_ELEMENT}] 六要素缺失「来源」：origin.sourceName 必填`);
  if (!origin || !isNonEmptyString(origin.fetchedAt as string))
    errors.push(`[${KB_ERROR_MISSING_ELEMENT}] 六要素缺失「来源」：origin.fetchedAt 必填`);
  // 2. 章节：sectionTitle
  if (!isNonEmptyString(e.sectionTitle as string))
    errors.push(`[${KB_ERROR_MISSING_ELEMENT}] 六要素缺失「章节」：sectionTitle 必填`);
  // 3. 机构：origin.publisher 或归属科室（知识库 ownerDepartment）二选一
  const publisher = origin?.publisher;
  const departmentOk = isNonEmptyString(lookupBaseOwnerDepartment);
  if (!isNonEmptyString(publisher as string) && !departmentOk)
    errors.push(`[${KB_ERROR_MISSING_ELEMENT}] 六要素缺失「机构」：origin.publisher 或知识库 ownerDepartment 必填`);
  // 4. 生效日期：effectiveDate
  if (!isNonEmptyString(e.effectiveDate as string))
    errors.push(`[${KB_ERROR_MISSING_ELEMENT}] 六要素缺失「生效日期」：effectiveDate 必填`);
  else if (Number.isNaN(Date.parse(e.effectiveDate as string)))
    errors.push(`[${KB_ERROR_VALIDATION}] effectiveDate 必须为合法 ISO8601 日期`);
  // 5. 专科：specialty 非空数组
  if (!isStringArray(e.specialty) || (e.specialty as string[]).length === 0)
    errors.push(`[${KB_ERROR_MISSING_ELEMENT}] 六要素缺失「专科」：specialty 必须为非空数组`);
  // 6. 密级：securityLevel 枚举
  if (!SECURITY_LEVELS.includes(e.securityLevel as SecurityLevel))
    errors.push(`[${KB_ERROR_MISSING_ELEMENT}] 六要素缺失「密级」：securityLevel 必须为 ${SECURITY_LEVELS.join(' / ')} 之一`);

  // 其余结构必填
  for (const field of ['id', 'knowledgeBaseId', 'title', 'owner', 'content', 'versionRef'] as const) {
    if (!isNonEmptyString(e[field] as string)) errors.push(`[${KB_ERROR_VALIDATION}] 条目 ${field} 必须为非空字符串`);
  }
  if (!KNOWLEDGE_STATUSES.includes(e.status as KnowledgeStatus))
    errors.push(`[${KB_ERROR_VALIDATION}] status 必须为知识状态机合法状态`);
  if (e.status === 'approved' && (!isNonEmptyString(e.approver as string) || !isNonEmptyString(e.approvedAt as string)))
    errors.push(`[${KB_ERROR_VALIDATION}] approved 状态条目必须有 approver 与 approvedAt`);

  return errors;
}

// ============================================================================
// 生命周期注册表（进程内存，深拷贝隔离）
// ============================================================================

/**
 * 知识生命周期注册表：六域台账、准入留痕、状态机、生效 / 失效、冲突分组、
 * 评审周期与历史版本快照检索。内存台账；持久化落库归后续切片。
 */
export class KnowledgeLifecycleRegistry {
  private readonly bases = new Map<string, KnowledgeBaseMeta>();
  private readonly entries = new Map<string, KnowledgeEntry>();
  private readonly trail: AdmissionTrailRecord[] = [];

  // --------------------------------------------------------------------------
  // 台账登记
  // --------------------------------------------------------------------------

  /** 登记知识库台账；六域枚举 / 必填 / 专科 / 密级口径校验；重复 id 拒绝；返回深拷贝 */
  registerBase(meta: KnowledgeBaseMeta): KnowledgeBaseMeta {
    const errors = validateKnowledgeBaseMeta(meta);
    if (errors.length > 0) throw new Error(`[${KB_ERROR_VALIDATION}] 知识库校验未通过：${errors.join('；')}`);
    if (this.isKnownId(meta.id)) throw new Error(`[${KB_ERROR_DUPLICATE_ID}] 知识库 id「${meta.id}」已存在，禁止重复登记`);

    const now = nowIso();
    const seeded: KnowledgeBaseMeta = {
      ...meta,
      reviewCycleMonths: meta.reviewCycleMonths ?? 3,
      tags: [...meta.tags],
      specialty: [...meta.specialty],
      status: meta.status ?? 'draft',
      createdAt: meta.createdAt ?? now,
      updatedAt: now,
      changeLog: [...(meta.changeLog ?? [])],
      reviewHistory: [...(meta.reviewHistory ?? [])],
    };
    this.bases.set(seeded.id, seeded);
    return deepClone(seeded);
  }

  /** 登记知识条目；六要素缺项入库拦截；患者标识字段拒绝；重复 id 拒绝；返回深拷贝 */
  registerEntry(entry: KnowledgeEntry): KnowledgeEntry {
    const base = this.bases.get(entry.knowledgeBaseId);
    const errors = validateKnowledgeEntry(entry, base?.ownerDepartment);
    if (errors.length > 0) throw new Error(`[${KB_ERROR_MISSING_ELEMENT}] 条目校验未通过：${errors.join('；')}`);
    if (this.isKnownId(entry.id)) throw new Error(`[${KB_ERROR_DUPLICATE_ID}] 条目 id「${entry.id}」已存在，禁止重复登记`);

    const now = nowIso();
    const seeded: KnowledgeEntry = {
      ...entry,
      specialty: [...entry.specialty],
      status: entry.status ?? 'draft',
      changeLog: [...(entry.changeLog ?? [])],
      reviewHistory: [...(entry.reviewHistory ?? [])],
    };
    this.entries.set(seeded.id, seeded);
    return deepClone(seeded);
  }

  private isKnownId(id: string): boolean {
    return this.bases.has(id) || this.entries.has(id);
  }

  // --------------------------------------------------------------------------
  // 准入流程
  // --------------------------------------------------------------------------

  /** 提交初审：draft → pending_review，写入准入留痕（提交人 / 适用范围 / 密级 / 用途） */
  submitForReview(
    id: string,
    submitter: string,
    scopeSummary: string,
    intendedUse: string,
  ): void {
    const target = this.resolve(id);
    if (target.record.status !== 'draft') {
      throw new Error(`[${KB_ERROR_INVALID_TRANSITION}] 仅 draft 状态可提交初审；当前为 ${target.record.status}（${transitionHint(target.record.status)}）`);
    }
    const securityLevel = target.kind === 'entry' ? target.record.securityLevel : 'internal';
    const linkedBase = target.kind === 'entry' ? this.bases.get(target.record.knowledgeBaseId) : this.bases.get(id);
    const trailRecord: AdmissionTrailRecord = {
      id,
      kind: target.kind,
      submittedBy: submitter,
      scopeSummary,
      intendedUse,
      securityLevel,
      status: 'pending_review',
      submittedAt: nowIso(),
      domain: linkedBase?.domain,
    };
    this.trail.push(trailRecord);
    this.transition(target, 'pending_review', submitter, scopeSummary, 'approved');
  }

  /** 审批通过：pending_review → approved，写 approver/approvedAt 与变更记录；知识库自动推算评审到期日 */
  approve(id: string, approver: string): void {
    const target = this.resolve(id);
    if (target.record.status !== 'pending_review') {
      throw new Error(`[${KB_ERROR_INVALID_TRANSITION}] 仅 pending_review 状态可审批通过；当前为 ${target.record.status}（${transitionHint(target.record.status)}）`);
    }
    const approvedAt = nowIso();
    target.record.approver = approver;
    target.record.approvedAt = approvedAt;
    if (target.kind === 'base') {
      target.record.reviewDueAt = addMonths(approvedAt, target.record.reviewCycleMonths);
    }
    this.transition(target, 'approved', approver, `准入审批通过：${approver} 签字留痕`, 'approved');
    const trailRecord = this.trail.find((t) => t.id === id);
    if (trailRecord) {
      trailRecord.approver = approver;
      trailRecord.approvedAt = approvedAt;
      trailRecord.status = 'approved';
    }
  }

  /** 审批退回：pending_review → draft，变更记录标注 rejected */
  reject(id: string, reviewer: string, note: string): void {
    const target = this.resolve(id);
    if (target.record.status !== 'pending_review') {
      throw new Error(`[${KB_ERROR_INVALID_TRANSITION}] 仅 pending_review 状态可退回修订；当前为 ${target.record.status}（${transitionHint(target.record.status)}）`);
    }
    this.transition(target, 'draft', reviewer, `准入退回修订：${note}`, 'rejected');
    const trailRecord = this.trail.find((t) => t.id === id);
    if (trailRecord) trailRecord.status = 'draft';
  }

  /** 停用归档：approved → deprecated */
  deprecate(id: string, operator: string, reason: string): void {
    const target = this.resolve(id);
    if (target.record.status !== 'approved') {
      throw new Error(`[${KB_ERROR_INVALID_TRANSITION}] 仅 approved 状态可停用归档；当前为 ${target.record.status}（${transitionHint(target.record.status)}）`);
    }
    this.transition(target, 'deprecated', operator, `停用归档：${reason}`);
  }

  /** 新版本替代旧版本：旧版本 approved → superseded，双向版本链可溯；新版本入库并挂 parentVersionRef */
  supersede(id: string, newEntry: KnowledgeEntry, operator: string): KnowledgeEntry {
    const old = this.resolveEntry(id);
    if (old.status !== 'approved') {
      throw new Error(`[${KB_ERROR_INVALID_TRANSITION}] 仅 approved 版本可被替代；当前为 ${old.status}（${transitionHint(old.status)}）`);
    }
    const base = this.bases.get(newEntry.knowledgeBaseId);
    const errors = validateKnowledgeEntry(newEntry, base?.ownerDepartment);
    if (errors.length > 0) throw new Error(`[${KB_ERROR_MISSING_ELEMENT}] 新版本条目校验未通过：${errors.join('；')}`);
    if (this.isKnownId(newEntry.id))
      throw new Error(`[${KB_ERROR_DUPLICATE_ID}] 新版本条目 id「${newEntry.id}」已存在`);

    const now = nowIso();
    const seeded: KnowledgeEntry = {
      ...newEntry,
      specialty: [...newEntry.specialty],
      status: newEntry.status ?? 'draft',
      changeLog: [
        {
          versionRef: newEntry.versionRef,
          changedAt: now,
          operator,
          summary: `替代旧版本 ${old.versionRef}`,
          parentVersionRef: old.versionRef,
        },
        ...(newEntry.changeLog ?? []),
      ],
      reviewHistory: [...(newEntry.reviewHistory ?? [])],
    };
    this.entries.set(seeded.id, seeded);

    old.status = 'superseded';
    old.supersededBy = seeded.id;
    old.updatedAt = now;
    old.changeLog.push({
      versionRef: old.versionRef,
      changedAt: now,
      operator,
      summary: `被新版本 ${seeded.versionRef} 替代`,
      parentVersionRef: seeded.versionRef,
    });

    return deepClone(seeded);
  }

  // --------------------------------------------------------------------------
  // 生效 / 失效与召回过滤
  // --------------------------------------------------------------------------

  /** 生效判定：approved 且当前时间 ≥ effectiveDate 且未到 expireDate（无 expireDate 视为长期有效） */
  isActive(entry: KnowledgeEntry, now?: Date): boolean {
    const nowMs = (now ?? new Date()).getTime();
    if (entry.status !== 'approved') return false;
    if (nowMs < Date.parse(entry.effectiveDate)) return false;
    if (entry.expireDate && nowMs >= Date.parse(entry.expireDate)) return false;
    return true;
  }

  /** 扫描到期条目：approved 且 expireDate 已到 → expired，写变更记录；返回转入历史的条目 */
  scanExpired(now?: Date): KnowledgeEntry[] {
    const nowMs = (now ?? new Date()).getTime();
    const expired: KnowledgeEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.status !== 'approved' || !entry.expireDate) continue;
      if (nowMs >= Date.parse(entry.expireDate)) {
        entry.status = 'expired';
        entry.updatedAt = nowIso();
        entry.changeLog.push({
          versionRef: entry.versionRef,
          changedAt: entry.updatedAt,
          operator: 'system-expiry-scan',
          summary: `到达失效日期 ${entry.expireDate}，自动转入历史不参与召回`,
        });
        expired.push(entry);
      }
    }
    return expired.map((entry) => deepClone(entry));
  }

  /** 召回清单：过期 / 被替代 / 停用 / 未生效条目一律不出现在结果；按六域 / 专科 / 密级 / 科室 / 知识库精确过滤 */
  listActiveForRetrieval(filter: RetrievalFilter = {}, now?: Date): KnowledgeEntry[] {
    const result: KnowledgeEntry[] = [];
    for (const entry of this.entries.values()) {
      if (!this.isActive(entry, now)) continue;
      if (filter.knowledgeBaseId && entry.knowledgeBaseId !== filter.knowledgeBaseId) continue;
      if (filter.securityLevel && entry.securityLevel !== filter.securityLevel) continue;
      if (filter.specialty && !entry.specialty.includes(filter.specialty)) continue;
      const base = this.bases.get(entry.knowledgeBaseId);
      if (filter.domain && base?.domain !== filter.domain) continue;
      if (filter.ownerDepartment && base?.ownerDepartment !== filter.ownerDepartment) continue;
      result.push(entry);
    }
    return result.map((entry) => deepClone(entry));
  }

  // --------------------------------------------------------------------------
  // 冲突分组
  // --------------------------------------------------------------------------

  /** 按冲突分组回查条目 */
  listConflictGroup(group: string): KnowledgeEntry[] {
    return [...this.entries.values()].filter((e) => e.conflictGroup === group).map((e) => deepClone(e));
  }

  /** 标记冲突分组内 approved 条目冲突待人工确认；评审结论写入 reviewHistory */
  flagConflict(group: string, operator: string, note: string): void {
    const targets = [...this.entries.values()].filter((e) => e.conflictGroup === group);
    if (targets.length === 0) throw new Error(`[${KB_ERROR_NOT_FOUND}] 冲突分组「${group}」下无条目`);
    for (const entry of targets) {
      entry.reviewHistory.push({
        reviewedAt: nowIso(),
        reviewer: operator,
        conclusion: 'revise',
        note,
        evidenceRef: group,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 季度评审
  // --------------------------------------------------------------------------

  /** 返回到期待评审知识库台账（reviewDueAt ≤ 当前时间） */
  listReviewDue(now?: Date): KnowledgeBaseMeta[] {
    const nowMs = (now ?? new Date()).getTime();
    return [...this.bases.values()]
      .filter((b) => b.reviewDueAt && Date.parse(b.reviewDueAt) <= nowMs)
      .map((b) => deepClone(b));
  }

  /** 评审记录归档：continue 顺延评审到期日；revise 回 pending_review；retire 转 deprecated */
  recordReview(id: string, entry: KnowledgeReviewEntry): void {
    const target = this.resolve(id);
    target.record.reviewHistory.push(deepClone(entry));
    switch (entry.conclusion) {
      case 'continue': {
        if (target.kind === 'base') {
          target.record.reviewDueAt = addMonths(entry.reviewedAt, target.record.reviewCycleMonths);
        }
        target.record.updatedAt = entry.reviewedAt;
        break;
      }
      case 'revise': {
        if (target.record.status !== 'approved') {
          throw new Error(`[${KB_ERROR_INVALID_TRANSITION}] 仅 approved 状态可退回修订；当前为 ${target.record.status}`);
        }
        target.record.status = 'draft';
        target.record.updatedAt = entry.reviewedAt;
        target.record.changeLog.push({
          versionRef: target.record.versionRef,
          changedAt: entry.reviewedAt,
          operator: entry.reviewer,
          summary: `季度评审退回修订：${entry.note ?? ''}`,
        });
        break;
      }
      case 'retire': {
        if (target.record.status !== 'approved') {
          throw new Error(`[${KB_ERROR_INVALID_TRANSITION}] 仅 approved 状态可评审停用；当前为 ${target.record.status}`);
        }
        target.record.status = 'deprecated';
        target.record.updatedAt = entry.reviewedAt;
        target.record.changeLog.push({
          versionRef: target.record.versionRef,
          changedAt: entry.reviewedAt,
          operator: entry.reviewer,
          summary: `季度评审停用：${entry.note ?? ''}`,
        });
        break;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 准入留痕与版本快照检索
  // --------------------------------------------------------------------------

  /** 准入留痕检索：按审批人 / 时间窗 / 知识域过滤 */
  listAdmissionTrail(filter: { approver?: string; from?: string; to?: string; domain?: KnowledgeDomain } = {}): AdmissionTrailRecord[] {
    return this.trail
      .filter((record) => {
        if (filter.approver && record.approver !== filter.approver) return false;
        if (filter.from && record.submittedAt < filter.from) return false;
        if (filter.to && record.submittedAt > filter.to) return false;
        if (filter.domain && record.domain !== filter.domain) return false;
        return true;
      })
      .map((record) => deepClone(record));
  }

  /** 按版本号检索条目；被替代 / 过期历史条目仍可检索（供历史病历四维留痕引用），但不进入召回清单 */
  getEntryByVersion(versionRef: string): KnowledgeEntry | undefined {
    const entry = [...this.entries.values()].find((e) => e.versionRef === versionRef);
    return entry ? deepClone(entry) : undefined;
  }

  /** 回读知识库台账深拷贝 */
  getBase(id: string): KnowledgeBaseMeta | undefined {
    const base = this.bases.get(id);
    return base ? deepClone(base) : undefined;
  }

  /** 回读条目深拷贝 */
  getEntry(id: string): KnowledgeEntry | undefined {
    const entry = this.entries.get(id);
    return entry ? deepClone(entry) : undefined;
  }

  // --------------------------------------------------------------------------
  // 内部辅助
  // --------------------------------------------------------------------------

  private resolve(id: string): ResolvedTarget {
    const base = this.bases.get(id);
    if (base) return { kind: 'base', record: base };
    const entry = this.entries.get(id);
    if (entry) return { kind: 'entry', record: entry };
    throw new Error(`[${KB_ERROR_NOT_FOUND}] 台账对象「${id}」不存在`);
  }

  private resolveEntry(id: string): KnowledgeEntry {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`[${KB_ERROR_NOT_FOUND}] 知识条目「${id}」不存在`);
    return entry;
  }

  private transition(
    target: ResolvedTarget,
    to: KnowledgeStatus,
    operator: string,
    summary: string,
    reviewResult?: KnowledgeReviewResult,
  ): void {
    const from = target.record.status;
    if (!STATUS_TRANSITIONS[from].includes(to)) {
      throw new Error(`[${KB_ERROR_INVALID_TRANSITION}] 非法状态迁移 ${from} → ${to}；${transitionHint(from)}`);
    }
    target.record.status = to;
    target.record.updatedAt = nowIso();
    target.record.changeLog.push({
      versionRef: target.record.versionRef,
      changedAt: target.record.updatedAt,
      operator,
      summary,
      reviewResult,
    });
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _registry: KnowledgeLifecycleRegistry | null = null;

/** 获取进程级知识生命周期注册表单例 */
export function getKnowledgeLifecycleRegistry(): KnowledgeLifecycleRegistry {
  if (!_registry) _registry = new KnowledgeLifecycleRegistry();
  return _registry;
}

/** 测试专用：重置模块级单例 */
export function _resetKnowledgeLifecycleRegistry(): void {
  _registry = null;
}
