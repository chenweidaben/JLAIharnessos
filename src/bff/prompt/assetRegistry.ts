/**
 * 健澜AI原生医院操作系统OS - bff/prompt/assetRegistry.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 提示词四层资产台账（技术文档 3.4.2 四层资产模型、3.4.6 资产仓储）：
 * system / scenario / department / task 四层资产登记、发布审批状态机、版本快照与
 * 对比预留、归档 / 退役、Few-shot 引用校验；进程内存台账，深拷贝隔离，后续接 DB 仓储。
 *
 * 本切片（S-04）不迁移既有硬编码 ETHICS_LAYER 到资产库，保持默认兜底行为不变；
 * 资产静态加密仅留可插拔加密器接口口径，默认 `encrypted=false` 透传，风险登记在切片记录。
 *
 * @module bff/prompt/assetRegistry
 */

import { ETHICS_LAYER_TEXT } from '@/core/agent/SystemPromptBuilder.js';

// ============================================================================
// 类型契约（对齐技术文档 3.4.2）
// ============================================================================

/** 提示词层级：① system 全局红线 → ② scenario 场景 → ③ department 科室 → ④ task 任务 */
export type PromptLevel = 'system' | 'scenario' | 'department' | 'task';

/** 资产生命周期状态 */
export type PromptAssetStatus = 'draft' | 'review' | 'active' | 'archived' | 'deprecated';

/** 风险等级（与 Schema 重试降级口径一致，3.4.4） */
export type PromptRiskLevel = 'low' | 'medium' | 'high';

/** 资产适用范围；字段缺省表示不约束（科室缺省 / 'all' 为全院兜底） */
export interface PromptScope {
  scenario?: string;
  department?: string;
  agentId?: string;
}

/** 版本变更记录条目 */
export interface PromptChangeEntry {
  /** 对应资产版本号 */
  version: string;
  /** 变更时间（ISO 8601） */
  changedAt: string;
  /** 操作人 */
  operator: string;
  /** 变更摘要 */
  summary: string;
  /** 差异文档 / 评审记录引用标识（不落明文附件） */
  diffRef: string;
  /** 上一版本号 */
  parentVersion?: string;
  /** 评审结果 */
  reviewResult?: 'approved' | 'rejected';
}

/** 运行指标（按版本聚合，3.4.5；聚合口径由 metricsAggregator 模块维护） */
export interface PromptMetrics {
  agentId: string;
  scenario: string;
  version: string;
  window: string;
  calls: number;
  adoptionRate: number;
  modificationRate: number;
  rejectionRate: number;
  avgModifiedChars: number;
  schemaFailureRate: number;
  abnormalFlags: string[];
}

/** 提示词资产（3.4.2 字段逐一对齐） */
export interface PromptAsset {
  id: string;
  level: PromptLevel;
  name: string;
  nameEn?: string;
  scope: PromptScope;
  version: string;
  content: string;
  /** 模板变量清单（供加载链校验） */
  variables: string[];
  /** Few-shot 示例资产引用 ID */
  fewShotRefs: string[];
  /** JSON Schema 引用标识 */
  outputSchemaRef?: string;
  riskLevel: PromptRiskLevel;
  status: PromptAssetStatus;
  owner: string;
  approver?: string;
  approvedAt?: string;
  changeLog: PromptChangeEntry[];
  metrics: PromptMetrics;
  /** 资产归属医院，静态加密存储标记；本切片默认 false 透传，加密器接口后续接入 */
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 发布变更入参 */
export interface PublishChange {
  operator: string;
  summary: string;
  diffRef: string;
  parentVersion?: string;
  reviewResult?: 'approved' | 'rejected';
}

/** 资产列表过滤条件 */
export interface PromptAssetFilter {
  level?: PromptLevel;
  status?: PromptAssetStatus;
  scenario?: string;
  department?: string;
  agentId?: string;
}

// ============================================================================
// 枚举常量与纯函数校验
// ============================================================================

const LEVELS: readonly PromptLevel[] = ['system', 'scenario', 'department', 'task'];
const STATUSES: readonly PromptAssetStatus[] = ['draft', 'review', 'active', 'archived', 'deprecated'];
const RISK_LEVELS: readonly PromptRiskLevel[] = ['low', 'medium', 'high'];
const REVIEW_RESULTS = ['approved', 'rejected'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** 构造零值指标（供夹具与新资产初始化复用） */
export function createEmptyMetrics(agentId: string, scenario: string, version: string, window = 'all'): PromptMetrics {
  return {
    agentId,
    scenario,
    version,
    window,
    calls: 0,
    adoptionRate: 0,
    modificationRate: 0,
    rejectionRate: 0,
    avgModifiedChars: 0,
    schemaFailureRate: 0,
    abnormalFlags: [],
  };
}

function validateChangeEntry(entry: unknown, path: string): string[] {
  const errors: string[] = [];
  if (entry === null || typeof entry !== 'object') {
    errors.push(`${path} 必须是对象`);
    return errors;
  }
  const e = entry as Record<string, unknown>;
  if (!isNonEmptyString(e.version)) errors.push(`${path}.version 缺失或为空`);
  if (!isNonEmptyString(e.changedAt)) errors.push(`${path}.changedAt 缺失或为空`);
  if (!isNonEmptyString(e.operator)) errors.push(`${path}.operator 缺失或为空`);
  if (!isNonEmptyString(e.summary)) errors.push(`${path}.summary 缺失或为空`);
  if (!isNonEmptyString(e.diffRef)) errors.push(`${path}.diffRef 缺失或为空`);
  if (e.parentVersion !== undefined && typeof e.parentVersion !== 'string')
    errors.push(`${path}.parentVersion 必须为字符串`);
  if (e.reviewResult !== undefined && !REVIEW_RESULTS.includes(e.reviewResult as (typeof REVIEW_RESULTS)[number]))
    errors.push(`${path}.reviewResult「${String(e.reviewResult)}」非法`);
  return errors;
}

/**
 * 校验提示词资产，返回错误信息数组；空数组 = 通过。
 * 供 register 内部调用，也供单测直接断言正反用例。
 */
export function validatePromptAsset(asset: unknown): string[] {
  const errors: string[] = [];
  if (asset === null || typeof asset !== 'object') return ['提示词资产必须是对象'];
  const a = asset as Record<string, unknown>;

  if (!isNonEmptyString(a.id)) errors.push('字段 id 缺失或为空字符串');
  if (!LEVELS.includes(a.level as PromptLevel))
    errors.push(`字段 level「${String(a.level)}」非法，合法值：${LEVELS.join(' / ')}`);
  if (!isNonEmptyString(a.name)) errors.push('字段 name 缺失或为空字符串');
  if (a.nameEn !== undefined && typeof a.nameEn !== 'string') errors.push('字段 nameEn 必须为字符串');

  const scope = a.scope as Record<string, unknown> | undefined;
  if (scope === undefined || scope === null || typeof scope !== 'object') {
    errors.push('字段 scope 缺失或不是对象');
  } else {
    if (scope.scenario !== undefined && typeof scope.scenario !== 'string') errors.push('字段 scope.scenario 必须为字符串');
    if (scope.department !== undefined && typeof scope.department !== 'string') errors.push('字段 scope.department 必须为字符串');
    if (scope.agentId !== undefined && typeof scope.agentId !== 'string') errors.push('字段 scope.agentId 必须为字符串');
  }

  if (!isNonEmptyString(a.version)) errors.push('字段 version 缺失或为空字符串');
  if (!isNonEmptyString(a.content)) errors.push('字段 content 缺失或为空字符串');
  if (!isStringArray(a.variables)) errors.push('字段 variables 必须为字符串数组');
  if (!isStringArray(a.fewShotRefs)) errors.push('字段 fewShotRefs 必须为字符串数组');
  if (a.outputSchemaRef !== undefined && typeof a.outputSchemaRef !== 'string')
    errors.push('字段 outputSchemaRef 必须为字符串');
  if (!RISK_LEVELS.includes(a.riskLevel as PromptRiskLevel))
    errors.push(`字段 riskLevel「${String(a.riskLevel)}」非法，合法值：${RISK_LEVELS.join(' / ')}`);
  if (!STATUSES.includes(a.status as PromptAssetStatus))
    errors.push(`字段 status「${String(a.status)}」非法，合法值：${STATUSES.join(' / ')}`);
  if (!isNonEmptyString(a.owner)) errors.push('字段 owner 缺失或为空字符串');

  if (a.status === 'active') {
    if (!isNonEmptyString(a.approver)) errors.push('active 状态资产必须填写 approver');
    if (!isNonEmptyString(a.approvedAt)) errors.push('active 状态资产必须填写 approvedAt');
  }

  if (!Array.isArray(a.changeLog)) {
    errors.push('字段 changeLog 必须为数组');
  } else {
    a.changeLog.forEach((entry, index) => errors.push(...validateChangeEntry(entry, `changeLog[${index}]`)));
  }

  const metrics = a.metrics as Record<string, unknown> | undefined;
  if (metrics === undefined || metrics === null || typeof metrics !== 'object') {
    errors.push('字段 metrics 缺失或不是对象');
  } else {
    const numericKeys: Array<keyof PromptMetrics> = [
      'calls',
      'adoptionRate',
      'modificationRate',
      'rejectionRate',
      'avgModifiedChars',
      'schemaFailureRate',
    ];
    for (const key of numericKeys) {
      if (typeof metrics[key] !== 'number' || !Number.isFinite(metrics[key]))
        errors.push(`字段 metrics.${key} 必须为有限数值`);
    }
    if (!isStringArray(metrics.abnormalFlags)) errors.push('字段 metrics.abnormalFlags 必须为字符串数组');
  }

  if (typeof a.encrypted !== 'boolean') errors.push('字段 encrypted 必须为布尔值');
  if (!isNonEmptyString(a.createdAt)) errors.push('字段 createdAt 缺失或为空字符串');
  if (!isNonEmptyString(a.updatedAt)) errors.push('字段 updatedAt 缺失或为空字符串');

  return errors;
}

// ============================================================================
// 范围匹配
// ============================================================================

function scopeMatches(assetScope: PromptScope, req: PromptScope): boolean {
  if (assetScope.scenario !== undefined && assetScope.scenario !== req.scenario) return false;
  if (
    assetScope.department !== undefined &&
    assetScope.department !== 'all' &&
    assetScope.department !== req.department
  ) {
    return false;
  }
  if (assetScope.agentId !== undefined && assetScope.agentId !== req.agentId) return false;
  return true;
}

/** 范围匹配得分：精确匹配优先于通配兜底，同分取最新 updatedAt */
function scopeScore(scope: PromptScope, req: PromptScope): number {
  let score = 0;
  if (scope.scenario !== undefined && scope.scenario === req.scenario) score += 1;
  if (scope.department !== undefined && scope.department !== 'all' && scope.department === req.department) score += 1;
  if (scope.agentId !== undefined && scope.agentId === req.agentId) score += 1;
  return score;
}

// ============================================================================
// 资产台账（进程内存，深拷贝隔离）
// ============================================================================

/** 提示词资产内存台账 */
export class PromptAssetRegistry {
  private readonly assets = new Map<string, PromptAsset>();

  /**
   * 登记资产：必填 / 枚举 / 变量清单校验；重复 id 拒绝；返回深拷贝。
   */
  register(asset: PromptAsset): PromptAsset {
    const errors = validatePromptAsset(asset);
    if (errors.length > 0) {
      throw new Error(`[PA-001] 提示词资产校验未通过：${errors.join('；')}`);
    }
    if (this.assets.has(asset.id)) {
      throw new Error(`[PA-002] 提示词资产 ID「${asset.id}」已存在，禁止重复登记`);
    }
    const stored = structuredClone(asset);
    this.assets.set(stored.id, stored);
    return structuredClone(stored);
  }

  /** 按 id 查询，返回深拷贝；未登记返回 undefined */
  getAsset(id: string): PromptAsset | undefined {
    const asset = this.assets.get(id);
    return asset ? structuredClone(asset) : undefined;
  }

  private require(id: string): PromptAsset {
    const asset = this.assets.get(id);
    if (!asset) throw new Error(`[PA-003] 提示词资产「${id}」未登记`);
    return asset;
  }

  /**
   * 取指定层级 active 资产：按 level + scope 匹配；科室空 / 'all' 为全院兜底；
   * 同 scope 多条 active 时精确匹配优先、同分取最新 updatedAt。
   * 多条候选的仲裁口径待 S-06 两套注册表统一方案收口。
   */
  getActiveAsset(level: PromptLevel, scope: PromptScope): PromptAsset | undefined {
    const matches = [...this.assets.values()].filter(
      (asset) => asset.status === 'active' && asset.level === level && scopeMatches(asset.scope, scope),
    );
    matches.sort(
      (a, b) => scopeScore(b.scope, scope) - scopeScore(a.scope, scope) || b.updatedAt.localeCompare(a.updatedAt),
    );
    return matches[0] ? structuredClone(matches[0]) : undefined;
  }

  /** 列出资产深拷贝；过滤条件均为精确匹配，未出现不约束 */
  listAssets(filter?: PromptAssetFilter): PromptAsset[] {
    let list = [...this.assets.values()];
    if (filter?.level !== undefined) list = list.filter((asset) => asset.level === filter.level);
    if (filter?.status !== undefined) list = list.filter((asset) => asset.status === filter.status);
    if (filter?.scenario !== undefined) list = list.filter((asset) => asset.scope.scenario === filter.scenario);
    if (filter?.department !== undefined)
      list = list.filter((asset) => asset.scope.department === filter.department);
    if (filter?.agentId !== undefined) list = list.filter((asset) => asset.scope.agentId === filter.agentId);
    return list.map((asset) => structuredClone(asset));
  }

  /**
   * 发布为 active：draft / review 可发布；archived / deprecated 不可回 active；
   * 评审结果必须为 approved；追加变更记录、写入 approver / approvedAt 与版本快照。
   */
  publish(id: string, change: PublishChange): PromptAsset {
    const asset = this.require(id);
    if (asset.status === 'archived' || asset.status === 'deprecated') {
      throw new Error(`[PA-004] 资产「${id}」状态为 ${asset.status}，不可回退至 active`);
    }
    if (change.reviewResult !== 'approved') {
      throw new Error(`[PA-004] 评审未通过（${change.reviewResult ?? '未评审'}），不可发布为 active`);
    }
    const now = new Date().toISOString();
    const entry: PromptChangeEntry = {
      version: asset.version,
      changedAt: now,
      operator: change.operator,
      summary: change.summary,
      diffRef: change.diffRef,
      parentVersion: change.parentVersion,
      reviewResult: change.reviewResult,
    };
    asset.changeLog.push(entry);
    asset.status = 'active';
    asset.approver = change.operator;
    asset.approvedAt = now;
    asset.updatedAt = now;
    return structuredClone(asset);
  }

  /** 归档；已归档 / 已退役拒绝重复操作 */
  archive(id: string): void {
    const asset = this.require(id);
    if (asset.status === 'archived') throw new Error(`[PA-004] 资产「${id}」已归档，不可重复归档`);
    asset.status = 'archived';
    asset.updatedAt = new Date().toISOString();
  }

  /** 退役；已归档 / 已退役拒绝重复操作 */
  deprecate(id: string): void {
    const asset = this.require(id);
    if (asset.status === 'deprecated') throw new Error(`[PA-004] 资产「${id}」已退役，不可重复退役`);
    asset.status = 'deprecated';
    asset.updatedAt = new Date().toISOString();
  }

  /**
   * 版本对比预留：基于变更记录条目返回存在差异的字段名清单；不做文本 diff 引擎。
   * 变更记录缺失对应版本时抛中文错误。
   */
  compareVersions(id: string, versionA: string, versionB: string): {
    level: PromptLevel;
    scope: PromptScope;
    aVersion: string;
    bVersion: string;
    fields: string[];
  } {
    const asset = this.require(id);
    const entryA = asset.changeLog.find((entry) => entry.version === versionA);
    const entryB = asset.changeLog.find((entry) => entry.version === versionB);
    if (!entryA || !entryB) {
      throw new Error(`[PA-006] 资产「${id}」缺少变更记录：${versionA} / ${versionB}`);
    }
    const pairs: Array<[string, unknown, unknown]> = [
      ['operator', entryA.operator, entryB.operator],
      ['summary', entryA.summary, entryB.summary],
      ['diffRef', entryA.diffRef, entryB.diffRef],
      ['parentVersion', entryA.parentVersion, entryB.parentVersion],
      ['reviewResult', entryA.reviewResult, entryB.reviewResult],
      ['changedAt', entryA.changedAt, entryB.changedAt],
    ];
    const fields = pairs.filter(([, av, bv]) => av !== bv).map(([field]) => field);
    return {
      level: asset.level,
      scope: structuredClone(asset.scope),
      aVersion: versionA,
      bVersion: versionB,
      fields,
    };
  }

  /** 追加变更记录；未登记 id 抛错；返回 void */
  recordChange(id: string, entry: PromptChangeEntry): void {
    const asset = this.require(id);
    asset.changeLog.push(structuredClone(entry));
    asset.updatedAt = entry.changedAt;
  }

  /** 返回变更记录深拷贝；未登记 id 抛错 */
  getChangeLog(id: string): PromptChangeEntry[] {
    const asset = this.require(id);
    return structuredClone(asset.changeLog);
  }

  /**
   * 校验并返回 Few-shot 引用资产：引用必须全部存在且 status='active'；
   * 缺失 / 未启用抛中文错误并附缺失引用 id 清单。
   */
  resolveFewShot(assetId: string, registry: PromptAssetRegistry): PromptAsset[] {
    const asset = this.require(assetId);
    const missing: string[] = [];
    const targets: PromptAsset[] = [];
    for (const ref of asset.fewShotRefs) {
      const target = registry.getAsset(ref);
      if (!target || target.status !== 'active') {
        missing.push(ref);
      } else {
        targets.push(target);
      }
    }
    if (missing.length > 0) {
      throw new Error(`[PA-005] 资产「${assetId}」Few-shot 引用缺失或未启用：${missing.join('、')}`);
    }
    return targets.map((target) => structuredClone(target));
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _registry: PromptAssetRegistry | null = null;

/** 获取进程级提示词资产台账单例 */
export function getPromptAssetRegistry(): PromptAssetRegistry {
  if (!_registry) _registry = new PromptAssetRegistry();
  return _registry;
}

/** 测试专用：重置资产台账单例 */
export function _resetPromptAssetRegistry(): void {
  _registry = null;
}

// ============================================================================
// 系统种子资产（A07：ETHICS_LAYER 六条红线迁入 system 资产库，版本化留痕）
// ============================================================================

/** 系统伦理红线种子资产保留 ID（system 层不可被智能体包引用覆盖） */
export const SYSTEM_ETHICS_ASSET_ID = 'prompt-system-ethics-001';

/** 种子资产元信息注入项（时间戳 / 责任人可入参，便于单测确定性校验；不写院方实名） */
export interface SystemEthicsSeedMeta {
  /** 登记时间（ISO 8601）；缺省取当前系统时间 */
  now?: string;
  /** 登记责任人；缺省平台治理标识 */
  operator?: string;
  /** 审批人；缺省沿用岗位提示词台账合成角色标识 */
  approver?: string;
}

/** 判定资产 ID 是否为 system 层保留种子 ID（智能体包 systemPrompt 引用不得占用） */
export function isReservedSystemAssetId(id: string): boolean {
  return id === SYSTEM_ETHICS_ASSET_ID;
}

/**
 * 构造系统伦理红线种子资产（纯工厂，不触碰台账）。
 * 六条红线文本与既有 `SystemPromptBuilder.ETHICS_LAYER` 同源；version=1.0.0、
 * riskLevel='high'、status='active'，变更记录留痕首版审批。
 */
export function buildSystemEthicsSeedAsset(meta?: SystemEthicsSeedMeta): PromptAsset {
  const now = meta?.now ?? new Date().toISOString();
  const operator = meta?.operator ?? 'platform-governance';
  const approver = meta?.approver ?? '医务部-王主任';
  return {
    id: SYSTEM_ETHICS_ASSET_ID,
    level: 'system',
    name: '系统医疗伦理红线（种子资产）',
    scope: {},
    version: '1.0.0',
    content: ETHICS_LAYER_TEXT,
    variables: [],
    fewShotRefs: [],
    riskLevel: 'high',
    status: 'active',
    owner: operator,
    approver,
    approvedAt: now,
    changeLog: [
      {
        version: '1.0.0',
        changedAt: now,
        operator,
        summary: '系统医疗伦理六条红线迁入 system 资产库首版',
        diffRef: 'seed-system-ethics-1.0.0',
        reviewResult: 'approved',
      },
    ],
    metrics: createEmptyMetrics('platform', 'system', '1.0.0'),
    encrypted: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 幂等登记系统伦理红线种子资产：已登记则直接回读现有资产深拷贝，不重复登记、
 * 不覆盖既有内容；未登记则构造种子资产并登记。函数不自动写入模块单例，
 * 由调用方显式传入台账实例；空台账回退 `SystemPromptBuilder.build()` 的既有路径不受影响。
 */
export function registerSystemEthicsSeed(
  registry: PromptAssetRegistry,
  meta?: SystemEthicsSeedMeta,
): PromptAsset {
  const existing = registry.getAsset(SYSTEM_ETHICS_ASSET_ID);
  if (existing) return structuredClone(existing);
  return registry.register(buildSystemEthicsSeedAsset(meta));
}
