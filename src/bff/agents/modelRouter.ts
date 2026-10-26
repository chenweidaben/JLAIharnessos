/**
 * 健澜AI原生医院操作系统OS - bff/agents/modelRouter.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 模型策略路由（技术文档 3.2.2 ModelRouteRule、3.2.3 策略路由模块、3.2.4 模型选择
 * 流程、3.2.6 验收标准）：规则匹配 → 最高优先级组 → 会话粘性一致性哈希 / 权重分流 →
 * 健康判定与主备降级 → 影子模型标记；路由事件进程内存留痕，为 S-08 审计链预留字段。
 *
 * 本切片（S-03）为纯函数 + 进程内存决策层，不接真实 LLM、不连数据库、不发起网络
 * 请求；不创建真实 provider 实例，不改变现有单实例 provider 默认行为：无匹配规则时
 * 显式回退既有默认路径。ModelProviderPort 宽接口、适配层扩展、BFF 路由与前端页面
 * 属后续切片，本模块不实现。
 *
 * @module bff/agents/modelRouter
 */

import {
  type ModelCard,
  type ModelRegistry,
  getModelRegistry,
} from './modelRegistry.js';

// ============================================================================
// 类型契约（对齐技术文档 3.2.2 ModelRouteRule / 3.2.4 RouteRequest）
// ============================================================================

/** 上下文长度档（由上游按 tokenBudget / 上下文窗口推导后传入） */
export type ContextLength = 'short' | 'medium' | 'long';

/** 时延 / 成本档位（由上游按 SLA 与成本口径推导后传入） */
export type PerformanceTier = 'low' | 'medium' | 'high';

/** 粘性键：患者标识 / 就诊标识 / 不粘性 */
export type StickyKey = 'patientId' | 'visitId' | 'none';

/** 规则匹配条件；未出现的字段表示不约束 */
export interface ModelRouteMatch {
  department?: string;
  scenario?: string;
  agentId?: string;
  contextLength?: ContextLength;
  latencyTier?: PerformanceTier;
  costTier?: PerformanceTier;
}

/** 策略路由规则（3.2.2 ModelRouteRule） */
export interface ModelRouteRule {
  /** 规则稳定标识 */
  id: string;
  /** 优先级（数值越大越先匹配；同优先级参与权重分流 / 粘性分组） */
  priority: number;
  /** 匹配条件（未出现 = 不约束） */
  match: ModelRouteMatch;
  /** 选中模型卡片 ID */
  modelId: string;
  /** 流量权重 0~1；同优先级启用规则权重和为 1 */
  trafficWeight: number;
  /** 影子比对模型 ID（双跑仅记录不输出，本切片不发起影子调用） */
  shadowModelId?: string;
  /** 粘性键；缺省 / 'none' 表示不粘性 */
  stickyKey?: StickyKey;
  /** 是否启用 */
  enabled: boolean;
}

/** 路由请求（3.2.4 RouteRequest；latencyTier / costTier 由上游推导后传入） */
export interface RouteRequest {
  department?: string;
  scenario?: string;
  agentId?: string;
  contextLength?: ContextLength;
  /** token 预算（本切片仅透传留痕，预算 → 档位推导属后续观测切片） */
  tokenBudget?: number;
  patientId?: string;
  visitId?: string;
  /** 时延档位（上游推导传入） */
  latencyTier?: PerformanceTier;
  /** 成本档位（上游推导传入） */
  costTier?: PerformanceTier;
}

/** 路由决策结果（3.2.3 RouteDecision） */
export interface RouteDecision {
  /** 选中模型卡片 ID；无匹配规则时为 undefined */
  modelId: string | undefined;
  /** 备用模型卡片 ID（主备降级后保留原主用 ID；健康主用时为卡片登记的备用 ID） */
  fallbackModelId?: string;
  /** 影子比对模型 ID（仅标记，不发起影子调用） */
  shadowModelId?: string;
  stickyKey: StickyKey;
  /** 决策说明（中文，含规则编号与模型 ID，便于审计追溯） */
  routeReason: string;
  /** 命中规则 ID */
  matchedRuleId?: string;
  /** 是否降级（主备均不可用 / 规则引用卡片未登记） */
  degraded: boolean;
  /** 降级原因说明 */
  degradedReason?: string;
  /** 是否携带影子模型 */
  shadow: boolean;
  /** 粘性哈希桶位（非粘性分流时为空） */
  stickyBucket?: number;
}

/** 路由事件（主备切换 / 影子留痕；不落 DB，为 S-08 审计链预留字段） */
export interface RouteEvent {
  /** 事件序号（自增） */
  seq: number;
  /** 决策时间（ISO 8601） */
  at: string;
  ruleId?: string;
  modelId?: string;
  fallbackModelId?: string;
  shadowModelId?: string;
  stickyKey: string;
  patientId?: string;
  visitId?: string;
  agentId?: string;
  scenario?: string;
  degraded: boolean;
  routeReason: string;
}

// ============================================================================
// 纯函数校验
// ============================================================================

const CONTEXT_LENGTHS: readonly ContextLength[] = ['short', 'medium', 'long'];
const PERFORMANCE_TIERS: readonly PerformanceTier[] = ['low', 'medium', 'high'];
const STICKY_KEYS: readonly StickyKey[] = ['patientId', 'visitId', 'none'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 校验路由规则，返回错误信息数组；空数组 = 通过。
 * 供 registerRule 内部调用，也供单测直接断言正反用例。
 */
export function validateRouteRule(rule: unknown): string[] {
  const errors: string[] = [];
  if (rule === null || typeof rule !== 'object') return ['路由规则必须是对象'];
  const r = rule as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) errors.push('字段 id 缺失或为空字符串');
  if (!isNonEmptyString(r.modelId)) errors.push('字段 modelId 缺失或为空字符串');
  if (typeof r.priority !== 'number' || !Number.isFinite(r.priority))
    errors.push('字段 priority 必须为有限数值');
  if (typeof r.trafficWeight !== 'number' || !Number.isFinite(r.trafficWeight) || r.trafficWeight < 0 || r.trafficWeight > 1)
    errors.push(`字段 trafficWeight「${String(r.trafficWeight)}」越界，合法区间 [0, 1]`);
  if (typeof r.enabled !== 'boolean') errors.push('字段 enabled 必须为布尔值');

  if (r.stickyKey !== undefined && !STICKY_KEYS.includes(r.stickyKey as StickyKey))
    errors.push(`字段 stickyKey「${String(r.stickyKey)}」非法，合法值：${STICKY_KEYS.join(' / ')}`);

  const match = r.match as Record<string, unknown> | undefined;
  if (match === undefined || match === null) {
    errors.push('字段 match 缺失或不是对象');
  } else {
    if (match.contextLength !== undefined && !CONTEXT_LENGTHS.includes(match.contextLength as ContextLength))
      errors.push(`字段 match.contextLength「${String(match.contextLength)}」非法`);
    if (match.latencyTier !== undefined && !PERFORMANCE_TIERS.includes(match.latencyTier as PerformanceTier))
      errors.push(`字段 match.latencyTier「${String(match.latencyTier)}」非法`);
    if (match.costTier !== undefined && !PERFORMANCE_TIERS.includes(match.costTier as PerformanceTier))
      errors.push(`字段 match.costTier「${String(match.costTier)}」非法`);
  }

  return errors;
}

// ============================================================================
// 规则台账（进程内存）
// ============================================================================

/** 权重和校验容差 */
const WEIGHT_TOLERANCE = 1e-6;

/** 策略规则内存台账 */
export class ModelRouteRegistry {
  private readonly rules = new Map<string, ModelRouteRule>();

  /**
   * 登记路由规则：校验必填字段与枚举合法值；重复 id 拒绝；返回规则深拷贝。
   */
  registerRule(rule: ModelRouteRule): ModelRouteRule {
    const errors = validateRouteRule(rule);
    if (errors.length > 0) {
      throw new Error(`[RT-001] 路由规则校验未通过：${errors.join('；')}`);
    }
    const id = rule.id.trim();
    if (this.rules.has(id)) {
      throw new Error(`[RT-002] 路由规则 ID「${id}」已存在，禁止重复登记`);
    }
    const stored = structuredClone(rule);
    stored.id = id;
    this.rules.set(id, stored);
    return structuredClone(stored);
  }

  /** 返回全部规则深拷贝（按登记先后） */
  listRules(): ModelRouteRule[] {
    return Array.from(this.rules.values()).map((rule) => structuredClone(rule));
  }

  /** 启停规则；未登记 id 抛中文错误 */
  setRuleEnabled(id: string, enabled: boolean): void {
    const rule = this.rules.get(id);
    if (!rule) throw new Error(`[RT-003] 路由规则「${id}」未登记`);
    rule.enabled = enabled;
  }

  /** 移除规则；不存在时静默返回 */
  removeRule(id: string): void {
    this.rules.delete(id);
  }

  /**
   * 按 priority 分组校验启用规则权重和是否为 1，返回错误信息数组（空 = 通过）。
   * 未启用规则不参与校验；不同优先级组独立核算。
   */
  validateWeights(): string[] {
    const groups = new Map<number, ModelRouteRule[]>();
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      const group = groups.get(rule.priority) ?? [];
      group.push(rule);
      groups.set(rule.priority, group);
    }
    const errors: string[] = [];
    for (const [priority, rules] of groups) {
      if (rules.length === 0) continue;
      const sum = rules.reduce((acc, rule) => acc + rule.trafficWeight, 0);
      if (Math.abs(sum - 1) > WEIGHT_TOLERANCE) {
        errors.push(
          `优先级 ${priority} 组启用规则权重和为 ${sum.toFixed(4)}，应为 1（规则：${rules
            .map((rule) => rule.id)
            .join('、')}）`,
        );
      }
    }
    return errors;
  }
}

// ============================================================================
// 模块级单例与事件台账
// ============================================================================

let _routeRegistry: ModelRouteRegistry | null = null;

/** 获取进程级规则台账单例 */
export function getModelRouteRegistry(): ModelRouteRegistry {
  if (!_routeRegistry) _routeRegistry = new ModelRouteRegistry();
  return _routeRegistry;
}

/** 测试专用：重置规则台账单例 */
export function _resetModelRouteRegistry(): void {
  _routeRegistry = null;
}

let _events: RouteEvent[] = [];
let _eventSeq = 0;

/** 返回路由事件深拷贝（按决策先后） */
export function listRouteEvents(): RouteEvent[] {
  return _events.map((event) => structuredClone(event));
}

/** 测试专用：清空事件台账并复位序号 */
export function _resetRouteEvents(): void {
  _events = [];
  _eventSeq = 0;
}

// ============================================================================
// 匹配与分流内部纯函数
// ============================================================================

/** 规则条件与请求逐项匹配；match 中未出现的字段不约束 */
function ruleMatches(rule: ModelRouteRule, req: RouteRequest): boolean {
  const m = rule.match;
  if (m.department !== undefined && req.department !== m.department) return false;
  if (m.scenario !== undefined && req.scenario !== m.scenario) return false;
  if (m.agentId !== undefined && req.agentId !== m.agentId) return false;
  if (m.contextLength !== undefined && req.contextLength !== m.contextLength) return false;
  if (m.latencyTier !== undefined && req.latencyTier !== m.latencyTier) return false;
  if (m.costTier !== undefined && req.costTier !== m.costTier) return false;
  return true;
}

/** FNV-1a 32 位确定性字符串哈希（同一标识恒得同一哈希值） */
function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** 一致性哈希桶位：同一标识在固定候选数量下恒得同一桶 */
function consistentHashBucket(identifier: string, bucketCount: number): number {
  if (bucketCount <= 1) return 0;
  return hashString(identifier) % bucketCount;
}

/** 按累计权重落桶；权重和异常时按比例归一化兜底 */
function weightedPick(rules: ModelRouteRule[], random: number): ModelRouteRule {
  const sum = rules.reduce((acc, rule) => acc + rule.trafficWeight, 0);
  const total = sum > 0 ? sum : 1;
  let acc = 0;
  const target = random * total;
  for (const rule of rules) {
    acc += rule.trafficWeight;
    if (target < acc) return rule;
  }
  return rules[rules.length - 1];
}

/** 判定卡片健康：熔断关闭且 available=true；卡片未登记视为不健康 */
function isHealthy(card: ModelCard | undefined): boolean {
  return card !== undefined && !card.health.circuitOpen && card.health.available;
}

// ============================================================================
// 决策器
// ============================================================================

/** 决策选项：注册表 / 规则台账 / 随机源 / 时钟均可注入，便于单测确定性验证 */
export interface SelectModelOptions {
  registry?: ModelRegistry;
  routeRegistry?: ModelRouteRegistry;
  /** 随机源（0~1）；缺省 Math.random */
  random?: () => number;
  /** 时钟注入（毫秒时间戳）；缺省 Date.now */
  now?: () => number;
}

/** 降级统一口径：主备均不可用时转人工 / 模板兜底，由工作流异常处理节点承接 */
const DEGRADED_REASON = '主备均不可用，转人工/模板兜底由工作流异常处理节点承接';

function pushEvent(decision: RouteDecision, req: RouteRequest, now: () => number): void {
  _eventSeq += 1;
  _events.push({
    seq: _eventSeq,
    at: new Date(now()).toISOString(),
    ruleId: decision.matchedRuleId,
    modelId: decision.modelId,
    fallbackModelId: decision.fallbackModelId,
    shadowModelId: decision.shadowModelId,
    stickyKey: decision.stickyKey,
    patientId: req.patientId,
    visitId: req.visitId,
    agentId: req.agentId,
    scenario: req.scenario,
    degraded: decision.degraded,
    routeReason: decision.routeReason,
  });
}

/**
 * 模型选择决策器。
 *
 * 流程（对齐 3.2.4）：
 *  1. 仅取 enabled=true 规则，条件逐项匹配；
 *  2. 按 priority 降序取最高优先级组；
 *  3. 粘性：规则声明 patientId / visitId 且对应标识存在时，一致性哈希固定候选；
 *     否则按 trafficWeight 权重分流；
 *  4. 健康判定：主用不可用沿 fallbackModelId 找备用；备用健康则切换，否则降级；
 *  5. shadowModelId 仅标记与留痕，不发起影子调用；
 *  6. 无匹配规则时回退既有默认 provider 路径，不强制选模型；
 *  7. 每次决策写一条 RouteEvent 供 S-08 审计链接入。
 */
export function selectModel(req: RouteRequest, options?: SelectModelOptions): RouteDecision {
  const registry = options?.registry ?? getModelRegistry();
  const routeRegistry = options?.routeRegistry ?? getModelRouteRegistry();
  const random = options?.random ?? Math.random;
  const now = options?.now ?? Date.now;

  const matched = routeRegistry
    .listRules()
    .filter((rule) => rule.enabled && ruleMatches(rule, req));

  // 无匹配规则：回退既有默认路径，不强制选模型
  if (matched.length === 0) {
    const decision: RouteDecision = {
      modelId: undefined,
      stickyKey: 'none',
      routeReason: '无匹配规则，沿用既有默认 provider 路径',
      degraded: false,
      shadow: false,
    };
    pushEvent(decision, req, now);
    return decision;
  }

  // 最高优先级组
  matched.sort((a, b) => b.priority - a.priority);
  const topPriority = matched[0].priority;
  const group = matched.filter((rule) => rule.priority === topPriority);

  // 粘性判定：组内首个声明粘性且对应标识存在的规则生效
  const activeSticky = group.find(
    (rule) =>
      rule.stickyKey === 'patientId' && Boolean(req.patientId),
  ) ?? group.find((rule) => rule.stickyKey === 'visitId' && Boolean(req.visitId));

  let chosen: ModelRouteRule;
  let stickyKey: StickyKey = 'none';
  let stickyBucket: number | undefined;

  if (activeSticky && activeSticky.stickyKey) {
    stickyKey = activeSticky.stickyKey;
    const identifier = stickyKey === 'patientId' ? req.patientId ?? '' : req.visitId ?? '';
    stickyBucket = consistentHashBucket(identifier, group.length);
    chosen = group[stickyBucket % group.length];
  } else {
    chosen = weightedPick(group, random());
  }

  const primaryCard = registry.getCard(chosen.modelId);

  // 规则引用卡片未登记：降级，modelId 保留规则引用 ID 供审计定位
  if (!primaryCard) {
    const decision: RouteDecision = {
      modelId: chosen.modelId,
      stickyKey,
      routeReason: `规则 ${chosen.id} 选定模型「${chosen.modelId}」未在注册表登记`,
      matchedRuleId: chosen.id,
      degraded: true,
      degradedReason: DEGRADED_REASON,
      shadow: chosen.shadowModelId !== undefined,
      shadowModelId: chosen.shadowModelId,
      stickyBucket,
    };
    pushEvent(decision, req, now);
    return decision;
  }

  const healthy = isHealthy(primaryCard);

  // 主用健康
  if (healthy) {
    const decision: RouteDecision = {
      modelId: primaryCard.id,
      fallbackModelId: primaryCard.fallbackModelId,
      stickyKey,
      routeReason: `规则 ${chosen.id} 匹配，主用模型「${primaryCard.id}」健康可用`,
      matchedRuleId: chosen.id,
      degraded: false,
      shadow: chosen.shadowModelId !== undefined,
      shadowModelId: chosen.shadowModelId,
      stickyBucket,
    };
    pushEvent(decision, req, now);
    return decision;
  }

  // 主用不可用：沿 fallbackModelId 找备用
  const fallbackId = primaryCard.fallbackModelId;
  const fallbackCard = fallbackId ? registry.getCard(fallbackId) : undefined;

  if (fallbackId && fallbackCard && !fallbackCard.health.circuitOpen && fallbackCard.health.available) {
    const decision: RouteDecision = {
      modelId: fallbackCard.id,
      fallbackModelId: primaryCard.id,
      stickyKey,
      routeReason: `主用模型「${primaryCard.id}」不可用，切换至备用模型「${fallbackCard.id}」`,
      matchedRuleId: chosen.id,
      degraded: false,
      shadow: chosen.shadowModelId !== undefined,
      shadowModelId: chosen.shadowModelId,
      stickyBucket,
    };
    pushEvent(decision, req, now);
    return decision;
  }

  // 备用未配置 / 未登记 / 不健康：降级，modelId 保留最后尝试卡片 ID
  const decision: RouteDecision = {
    modelId: primaryCard.id,
    fallbackModelId: fallbackId,
    stickyKey,
    routeReason: fallbackId
      ? `主用模型「${primaryCard.id}」不可用，备用模型「${fallbackId}」亦不可用`
      : `主用模型「${primaryCard.id}」不可用且未配置备用模型`,
    matchedRuleId: chosen.id,
    degraded: true,
    degradedReason: DEGRADED_REASON,
    shadow: chosen.shadowModelId !== undefined,
    shadowModelId: chosen.shadowModelId,
    stickyBucket,
  };
  pushEvent(decision, req, now);
  return decision;
}
