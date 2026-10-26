/**
 * 健澜AI原生医院操作系统OS - bff/agents/modelRegistry.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 模型注册表（技术文档 3.2.2 模型卡片与注册表设计、3.2.3 模块划分与接口契约、
 * 3.2.6 验收标准）：模型卡片登记、查询、标签/科室/能力检索、健康快照更新、
 * 状态机迁移留痕与版本回滚元数据台账。
 *
 * 本切片（S-02）为进程内存实现，后续里程碑接入 DB 仓储；不接真实 LLM、
 * 不连数据库、不发起网络请求。策略路由、权重分流、会话粘性哈希、主备降级
 * 决策与影子双跑标记属 S-03 及以后切片，本模块不实现。
 *
 * 安全口径：endpointRef 仅为凭据/端点配置的引用标识，卡片与台账中不落明文
 * 端点、密钥或 token；成本字段仅登记口径数值，不关联任何供应商凭证。
 *
 * @module bff/agents/modelRegistry
 */

// ============================================================================
// 类型契约（对齐技术文档 3.2.2）
// ============================================================================

/** 供应商类型（端点/密钥由 endpointRef 引用配置，本模块不持有明文） */
export type ModelProviderKind = 'openai-compatible' | 'deepseek' | 'anthropic' | 'local';

/** 模型分层：主力 / 辅助 / 专用（三层模型体系，差距矩阵 M-08） */
export type ModelTier = 'primary' | 'auxiliary' | 'specialized';

/** 模型职责角色 */
export type ModelRole =
  | 'main-large'
  | 'main-medium'
  | 'embedding'
  | 'rerank'
  | 'asr'
  | 'ocr'
  | 'ner'
  | 'classifier'
  | 'extractor'
  | 'rule';

/** 模型风险等级 */
export type ModelRiskLevel = 'low' | 'medium' | 'high';

/** 模型发布状态（状态机终态为 retired） */
export type ModelStatus = 'draft' | 'staging' | 'active' | 'shadow' | 'standby' | 'retired';

/** 模型健康快照（探针写回，3.2.2 ModelHealthSnapshot） */
export interface ModelHealthSnapshot {
  /** 最近探测时间（ISO 8601） */
  checkedAt: string;
  /** 当前是否判定可用 */
  available: boolean;
  /** 时延 P50（毫秒，单值即可；P95 可留空） */
  latencyMsP50?: number;
  /** 时延 P95（毫秒，可留空） */
  latencyMsP95?: number;
  /** 成功率（0~1，可留空，由探针/看板后续聚合） */
  successRate?: number;
  /** 错误率（0~1，可留空） */
  errorRate?: number;
  /** 连续失败次数（成功即清零） */
  consecutiveFailures: number;
  /** 熔断是否打开 */
  circuitOpen: boolean;
  /** 最近一次错误说明（不含密钥与患者明文） */
  lastError?: string;
}

/** 模型卡片（3.2.2 ModelCard） */
export interface ModelCard {
  /** 稳定标识，如 main-large-001 */
  id: string;
  /** 展示名称 */
  displayName: string;
  /** 供应商类型 */
  provider: ModelProviderKind;
  /** 凭据/端点配置引用标识（不落明文端点/密钥） */
  endpointRef: string;
  /** 供应商模型标识 */
  model: string;
  /** 三层分层 */
  tier: ModelTier;
  /** 职责角色 */
  role: ModelRole;
  /** 上下文窗口（tokens） */
  contextWindow: number;
  /** 能力标签：长文本 / 中文 / 表格理解 / 多模态 等 */
  capabilities: string[];
  /** 风险等级 */
  riskLevel: ModelRiskLevel;
  /** 默认推理参数 */
  defaultParams: {
    temperature: number;
    topP: number;
    maxTokens: number;
  };
  /** 绑定知识库 ID 列表（可空） */
  knowledgeDependencies: string[];
  /** 适用科室（空数组 = 全院） */
  departmentScope: string[];
  /** 任务场景标签：门诊病历 / 住院病程 / 会诊意见 / 质控 / 解读… */
  scenarioTags: string[];
  /** 责任人 */
  owner: string;
  /** 发布时间（ISO 8601） */
  releasedAt: string;
  /** 退役时间（ISO 8601，退役后填写） */
  retiredAt?: string;
  /** 当前版本号 */
  version: string;
  /** 发布状态 */
  status: ModelStatus;
  /** 健康快照 */
  health: ModelHealthSnapshot;
  /** 备用模型卡片 ID（主备切换属 S-03，本切片仅登记引用） */
  fallbackModelId?: string;
  /** 是否按患者/就诊标识粘性绑定（粘性路由属 S-03） */
  sessionSticky: boolean;
  /** 每 1k 输入 token 成本（口径数值，供看板） */
  costPer1kInput?: number;
  /** 每 1k 输出 token 成本（口径数值，供看板） */
  costPer1kOutput?: number;
  /** 合规备注（数据范围、留存要求等） */
  complianceNotes?: string;
}

/** 注册表过滤器：枚举字段精确匹配；标签/科室/能力按包含匹配 */
export interface ModelRegistryFilter {
  tier?: ModelTier;
  role?: ModelRole;
  status?: ModelStatus;
  provider?: ModelProviderKind;
  scenarioTag?: string;
  department?: string;
  capability?: string;
}

/** 版本台账记录（回滚元数据口径：台账 + previousVersion 指针 + 退役留痕；
 *  真实模型切换属 S-03/S-07，本切片不执行） */
export interface ModelVersionRecord {
  /** 版本号 */
  version: string;
  /** 登记/发布时间（ISO 8601） */
  releasedAt: string;
  /** 上一版本号（指向登记时卡片当前版本） */
  previousVersion?: string;
  /** 变更说明 */
  changelog: string;
  /** 责任人 */
  owner: string;
  /** 是否为基线版本标记 */
  baseline?: boolean;
  /** 退役时间（ISO 8601，退役记录填写） */
  retiredAt?: string;
  /** 备注（状态迁移原因、退役原因等） */
  note?: string;
}

// ============================================================================
// 枚举常量与状态机
// ============================================================================

const PROVIDER_KINDS: readonly ModelProviderKind[] = [
  'openai-compatible',
  'deepseek',
  'anthropic',
  'local',
];

const TIERS: readonly ModelTier[] = ['primary', 'auxiliary', 'specialized'];

const ROLES: readonly ModelRole[] = [
  'main-large',
  'main-medium',
  'embedding',
  'rerank',
  'asr',
  'ocr',
  'ner',
  'classifier',
  'extractor',
  'rule',
];

const RISK_LEVELS: readonly ModelRiskLevel[] = ['low', 'medium', 'high'];

const STATUSES: readonly ModelStatus[] = [
  'draft',
  'staging',
  'active',
  'shadow',
  'standby',
  'retired',
];

/**
 * 状态机合法迁移表：draft → staging → active → shadow → standby → retired；
 * retired 为终态，无出边。
 */
const STATUS_TRANSITIONS: Record<ModelStatus, ModelStatus[]> = {
  draft: ['staging'],
  staging: ['active'],
  active: ['shadow'],
  shadow: ['standby'],
  standby: ['retired'],
  retired: [],
};

/** 纯函数：判断状态迁移是否合法（同状态不视为迁移） */
export function isValidStatusTransition(from: ModelStatus, to: ModelStatus): boolean {
  if (from === to) return false;
  return STATUS_TRANSITIONS[from].includes(to);
}

// ============================================================================
// 纯函数校验
// ============================================================================

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * 校验模型卡片，返回错误信息数组；空数组表示通过。
 * 供 register 内部调用，也供单测直接断言正反用例。
 */
export function validateModelCard(card: unknown): string[] {
  const errors: string[] = [];
  if (card === null || typeof card !== 'object') {
    return ['模型卡片必须是对象'];
  }
  const c = card as Record<string, unknown>;

  if (!isNonEmptyString(c.id)) errors.push('字段 id 缺失或为空字符串');
  if (!isNonEmptyString(c.displayName)) errors.push('字段 displayName 缺失或为空字符串');
  if (!isNonEmptyString(c.endpointRef))
    errors.push('字段 endpointRef 缺失或为空字符串（仅允许配置引用标识，禁止明文端点/密钥）');
  if (!isNonEmptyString(c.model)) errors.push('字段 model 缺失或为空字符串');
  if (!isNonEmptyString(c.owner)) errors.push('字段 owner 缺失或为空字符串');
  if (!isNonEmptyString(c.releasedAt)) errors.push('字段 releasedAt 缺失或为空字符串');
  if (!isNonEmptyString(c.version)) errors.push('字段 version 缺失或为空字符串');

  if (!PROVIDER_KINDS.includes(c.provider as ModelProviderKind))
    errors.push(`字段 provider「${String(c.provider)}」非法，合法值：${PROVIDER_KINDS.join(' / ')}`);
  if (!TIERS.includes(c.tier as ModelTier))
    errors.push(`字段 tier「${String(c.tier)}」非法，合法值：${TIERS.join(' / ')}`);
  if (!ROLES.includes(c.role as ModelRole))
    errors.push(`字段 role「${String(c.role)}」非法，合法值：${ROLES.join(' / ')}`);
  if (!RISK_LEVELS.includes(c.riskLevel as ModelRiskLevel))
    errors.push(`字段 riskLevel「${String(c.riskLevel)}」非法，合法值：${RISK_LEVELS.join(' / ')}`);
  if (!STATUSES.includes(c.status as ModelStatus))
    errors.push(`字段 status「${String(c.status)}」非法，合法值：${STATUSES.join(' / ')}`);

  if (typeof c.contextWindow !== 'number' || !Number.isFinite(c.contextWindow) || c.contextWindow <= 0)
    errors.push('字段 contextWindow 必须为大于 0 的数字（tokens）');

  const params = c.defaultParams as Record<string, unknown> | undefined;
  if (!params || typeof params !== 'object') {
    errors.push('字段 defaultParams 缺失或不是对象');
  } else {
    const { temperature, topP, maxTokens } = params;
    if (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > 2)
      errors.push(`字段 defaultParams.temperature「${String(temperature)}」越界，合法区间 [0, 2]`);
    if (typeof topP !== 'number' || !Number.isFinite(topP) || topP < 0 || topP > 1)
      errors.push(`字段 defaultParams.topP「${String(topP)}」越界，合法区间 [0, 1]`);
    if (typeof maxTokens !== 'number' || !Number.isFinite(maxTokens) || maxTokens <= 0)
      errors.push('字段 defaultParams.maxTokens 必须为大于 0 的数字');
  }

  if (!isStringArray(c.capabilities)) errors.push('字段 capabilities 必须为字符串数组');
  if (!isStringArray(c.knowledgeDependencies)) errors.push('字段 knowledgeDependencies 必须为字符串数组');
  if (!isStringArray(c.departmentScope)) errors.push('字段 departmentScope 必须为字符串数组（空数组表示全院）');
  if (!isStringArray(c.scenarioTags)) errors.push('字段 scenarioTags 必须为字符串数组');

  if (typeof c.sessionSticky !== 'boolean') errors.push('字段 sessionSticky 必须为布尔值');

  if (c.health !== undefined && c.health !== null) {
    const h = c.health as Record<string, unknown>;
    if (typeof h !== 'object') {
      errors.push('字段 health 必须是健康快照对象');
    } else {
      if (typeof h.available !== 'boolean') errors.push('字段 health.available 必须为布尔值');
      if (typeof h.consecutiveFailures !== 'number' || h.consecutiveFailures < 0)
        errors.push('字段 health.consecutiveFailures 必须为非负数字');
      if (typeof h.circuitOpen !== 'boolean') errors.push('字段 health.circuitOpen 必须为布尔值');
      if (!isNonEmptyString(h.checkedAt ?? '')) errors.push('字段 health.checkedAt 缺失或为空字符串');
    }
  }

  return errors;
}

// ============================================================================
// 注册表实现
// ============================================================================

/** 生成默认健康快照：可用、零失败、熔断关闭 */
function defaultHealthSnapshot(nowIso: string): ModelHealthSnapshot {
  return {
    checkedAt: nowIso,
    available: true,
    consecutiveFailures: 0,
    circuitOpen: false,
  };
}

function matchesFilter(card: ModelCard, filter?: ModelRegistryFilter): boolean {
  if (!filter) return true;
  if (filter.tier !== undefined && card.tier !== filter.tier) return false;
  if (filter.role !== undefined && card.role !== filter.role) return false;
  if (filter.status !== undefined && card.status !== filter.status) return false;
  if (filter.provider !== undefined && card.provider !== filter.provider) return false;
  if (filter.scenarioTag !== undefined && !card.scenarioTags.includes(filter.scenarioTag)) return false;
  if (filter.department !== undefined) {
    // 空科室范围 = 全院，命中任意科室过滤条件
    if (card.departmentScope.length > 0 && !card.departmentScope.includes(filter.department)) return false;
  }
  if (filter.capability !== undefined && !card.capabilities.includes(filter.capability)) return false;
  return true;
}

/**
 * 模型注册表：进程内存台账。卡片与版本记录在内部以深拷贝保存，所有出口
 * 对象均为深拷贝，外部修改返回值不会反向污染台账。
 */
export class ModelRegistry {
  private readonly cards = new Map<string, ModelCard>();
  private readonly versionLedger = new Map<string, ModelVersionRecord[]>();

  /**
   * 登记模型卡片。
   * - 必填字段与枚举合法性校验不通过时抛出中文错误（含错误码）；
   * - 重复 id 拒绝登记；
   * - health 缺省时补默认快照；
   * - 返回登记卡片的深拷贝。
   */
  register(card: ModelCard): ModelCard {
    const errors = validateModelCard(card);
    if (errors.length > 0) {
      throw new Error(`[REG-007] 模型卡片校验未通过：${errors.join('；')}`);
    }
    const id = card.id.trim();
    if (this.cards.has(id)) {
      throw new Error(`[REG-002] 模型卡片 ID「${id}」已存在，禁止重复登记`);
    }
    const nowIso = new Date().toISOString();
    const stored: ModelCard = structuredClone(card);
    stored.id = id;
    stored.health = card.health ? structuredClone(card.health) : defaultHealthSnapshot(nowIso);
    this.cards.set(id, stored);
    this.versionLedger.set(id, []);
    return structuredClone(stored);
  }

  /** 按 id 查询卡片；未登记返回 undefined（返回深拷贝） */
  getCard(id: string): ModelCard | undefined {
    const card = this.cards.get(id);
    return card ? structuredClone(card) : undefined;
  }

  /** 按 id 查询卡片；未登记抛出中文错误 */
  getCardOrThrow(id: string): ModelCard {
    const card = this.cards.get(id);
    if (!card) throw new Error(`[REG-001] 模型卡片「${id}」未登记`);
    return structuredClone(card);
  }

  /** 按过滤器检索卡片，返回深拷贝数组；无过滤条件返回全部 */
  listCards(filter?: ModelRegistryFilter): ModelCard[] {
    return Array.from(this.cards.values())
      .filter((card) => matchesFilter(card, filter))
      .map((card) => structuredClone(card));
  }

  /** 合并写入健康快照；未登记 id 抛出中文错误 */
  updateHealth(id: string, snapshot: ModelHealthSnapshot): void {
    const card = this.cards.get(id);
    if (!card) throw new Error(`[REG-003] 模型卡片「${id}」未登记，无法更新健康快照`);
    card.health = { ...card.health, ...structuredClone(snapshot) };
  }

  /**
   * 状态机迁移：校验合法性后写入 status；迁移记录进入版本台账。
   * 非法迁移（含 retired 终态再迁移）抛出中文错误。
   */
  setStatus(id: string, status: ModelStatus, reason?: string): void {
    const card = this.cards.get(id);
    if (!card) throw new Error(`[REG-004] 模型卡片「${id}」未登记，无法变更状态`);
    if (!isValidStatusTransition(card.status, status)) {
      const allowed = STATUS_TRANSITIONS[card.status];
      const hint = allowed.length > 0 ? `合法迁移：${card.status} → ${allowed.join(' / ')}` : 'retired 为终态，禁止再迁移';
      throw new Error(`[REG-008] 非法状态迁移：${card.status} → ${status}；${hint}`);
    }
    const from = card.status;
    card.status = status;
    const nowIso = new Date().toISOString();
    if (status === 'retired') card.retiredAt = nowIso;
    const ledger = this.versionLedger.get(id) ?? [];
    ledger.push({
      version: card.version,
      releasedAt: nowIso,
      previousVersion: undefined,
      changelog: `状态迁移：${from} → ${status}${reason ? `（${reason}）` : ''}`,
      owner: card.owner,
      note: reason,
    });
  }

  /**
   * 追加版本台账记录；previousVersion 指向卡片登记前的当前版本，
   * 随后卡片版本号切换为记录版本。未登记 id 抛出中文错误。
   */
  recordVersion(cardId: string, record: ModelVersionRecord): void {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`[REG-005] 模型卡片「${cardId}」未登记，无法追加版本记录`);
    const stored: ModelVersionRecord = {
      ...structuredClone(record),
      previousVersion: card.version,
    };
    this.versionLedger.get(cardId)?.push(stored);
    card.version = stored.version;
    card.releasedAt = stored.releasedAt;
  }

  /** 按登记先后返回版本记录深拷贝；未登记 id 抛出中文错误 */
  getVersionHistory(cardId: string): ModelVersionRecord[] {
    if (!this.cards.has(cardId))
      throw new Error(`[REG-006] 模型卡片「${cardId}」未登记，无版本台账`);
    const ledger = this.versionLedger.get(cardId) ?? [];
    return ledger.map((record) => structuredClone(record));
  }

  /** 退役：置 retired、写 retiredAt，并追加退役版本记录留痕。 */
  retire(cardId: string, reason: string): void {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`[REG-009] 模型卡片「${cardId}」未登记，无法退役`);
    if (card.status === 'retired')
      throw new Error(`[REG-010] 模型卡片「${cardId}」已处于退役终态，禁止重复退役`);
    const nowIso = new Date().toISOString();
    card.status = 'retired';
    card.retiredAt = nowIso;
    const ledger = this.versionLedger.get(cardId) ?? [];
    ledger.push({
      version: card.version,
      releasedAt: nowIso,
      previousVersion: card.version,
      changelog: `模型退役：${reason}`,
      owner: card.owner,
      retiredAt: nowIso,
      note: reason,
    });
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _registry: ModelRegistry | null = null;

/** 获取进程级注册表单例（后续接 DB 仓储时替换为仓储实现） */
export function getModelRegistry(): ModelRegistry {
  if (!_registry) _registry = new ModelRegistry();
  return _registry;
}

/** 测试专用：重置模块级注册表单例 */
export function _resetModelRegistry(): void {
  _registry = null;
}
