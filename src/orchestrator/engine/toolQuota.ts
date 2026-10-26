/**
 * 健澜AI原生医院操作系统OS - orchestrator/engine/toolQuota.ts
 *
 * 工具频次 / 配额限流纯内存模块（差距矩阵 O-03；S-05/S-06 共享口径）：
 * 按工具 id × 角色 × 时间窗登记策略，进程内计数器按键累计；判定返回 `allowed` /
 * `throttled` 与剩余额度；窗口外计数自动重置；未配置策略默认放行。
 *
 * 边界：纯类型 + 纯函数 + 进程内存态；计数不持久化、不携带患者正文、不接入外部配额服务；
 * 不发起网络请求、不读取 DB；时间戳由入参注入，不依赖系统时钟以外的进程外资源。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 类型契约
// ============================================================================

/** 工具配额策略：工具 id、适用角色集合、时间窗、窗口内上限 */
export interface ToolQuotaPolicy {
  toolId: string;
  /** 适用角色集合；未配置或空数组表示全部角色适用 */
  roles?: string[];
  /** 窗口时长（毫秒，必须为正数） */
  windowMs: number;
  /** 窗口内最大调用次数（非负有限数值） */
  limit: number;
}

/** 判定结论：放行 / 限流 */
export type ToolQuotaDecisionKind = 'allowed' | 'throttled';

/** 配额判定结果 */
export interface ToolQuotaDecision {
  decision: ToolQuotaDecisionKind;
  /** 当前窗口剩余额度；未配置策略默认放行记 `Infinity`；限流记 0 */
  remaining: number;
  /** 命中策略的工具 id；未配置策略时为 undefined */
  policyToolId?: string;
  /** 限流原因（中文，不泄露策略台账内部结构） */
  reason?: string;
}

/** 未配置策略的放行剩余额度标记 */
export const QUOTA_UNLIMITED = Number.POSITIVE_INFINITY;

/** 配额策略校验错误前缀 */
export const QUOTA_ERROR_PREFIX = 'QUOTA-';

// ============================================================================
// 纯函数校验与匹配
// ============================================================================

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** 策略角色匹配：未配置角色集合 = 全部角色适用；否则角色必须在集合内 */
export function policyAppliesToRole(policy: ToolQuotaPolicy, role: string | undefined): boolean {
  if (!Array.isArray(policy.roles) || policy.roles.length === 0) return true;
  return typeof role === 'string' && policy.roles.includes(role);
}

/** 校验策略结构，返回中文错误清单（空数组 = 通过） */
export function validateToolQuotaPolicy(policy: unknown): string[] {
  const errors: string[] = [];
  if (typeof policy !== 'object' || policy === null) {
    return [`${QUOTA_ERROR_PREFIX}001 配额策略必须为对象`];
  }
  const p = policy as Record<string, unknown>;
  if (!isNonEmptyString(p.toolId)) errors.push(`${QUOTA_ERROR_PREFIX}001 toolId 必须为非空字符串`);
  if (p.roles !== undefined && (!Array.isArray(p.roles) || !p.roles.every((role) => typeof role === 'string')))
    errors.push(`${QUOTA_ERROR_PREFIX}001 roles 必须为字符串数组`);
  if (!Number.isFinite(p.windowMs) || (p.windowMs as number) <= 0)
    errors.push(`${QUOTA_ERROR_PREFIX}001 windowMs 必须为正数值`);
  if (!Number.isFinite(p.limit) || (p.limit as number) < 0)
    errors.push(`${QUOTA_ERROR_PREFIX}001 limit 必须为非负有限数值`);
  return errors;
}

// ============================================================================
// 内存配额守卫
// ============================================================================

interface CounterEntry {
  /** 当前窗口起始时间戳（epoch 毫秒） */
  windowStart: number;
  /** 当前窗口已用次数 */
  count: number;
}

/**
 * 进程内工具配额守卫：策略登记、只读判定、放行累计、窗口重置、测试重置。
 * 计数器按 `toolId::role` 分键；窗口过期后下次判定 / 累计先清零再计数。
 */
export class ToolQuotaGuard {
  private readonly policies = new Map<string, ToolQuotaPolicy>();
  private readonly counters = new Map<string, CounterEntry>();

  /** 登记或覆盖策略；结构非法抛中文错误；返回深拷贝策略 */
  registerPolicy(policy: ToolQuotaPolicy): ToolQuotaPolicy {
    const errors = validateToolQuotaPolicy(policy);
    if (errors.length > 0) throw new Error(errors.join('；'));
    const stored = structuredClone(policy);
    this.policies.set(stored.toolId, stored);
    return structuredClone(stored);
  }

  /** 回读全部已登记策略深拷贝（按登记顺序） */
  listPolicies(): ToolQuotaPolicy[] {
    return [...this.policies.values()].map((policy) => structuredClone(policy));
  }

  private counterKey(toolId: string, role: string | undefined): string {
    return `${toolId}::${role ?? '*'}`;
  }

  /** 取当前窗口有效计数；窗口外计数不累计，视为 0 */
  private currentCount(policy: ToolQuotaPolicy, role: string | undefined, now: number): number {
    const entry = this.counters.get(this.counterKey(policy.toolId, role));
    if (!entry || now - entry.windowStart >= policy.windowMs) return 0;
    return entry.count;
  }

  /** 只读判定（不累计）：未配置适用策略默认放行；超限返回 throttled 与 0 剩余 */
  evaluate(toolId: string, role: string | undefined, now: number): ToolQuotaDecision {
    const policy = this.policies.get(toolId);
    if (!policy || !policyAppliesToRole(policy, role)) {
      return { decision: 'allowed', remaining: QUOTA_UNLIMITED };
    }
    const count = this.currentCount(policy, role, now);
    if (count >= policy.limit) {
      return {
        decision: 'throttled',
        remaining: 0,
        policyToolId: toolId,
        reason: `工具「${toolId}」在 ${policy.windowMs}ms 窗口内已达上限 ${policy.limit} 次，本次调用被限流`,
      };
    }
    return { decision: 'allowed', remaining: policy.limit - count, policyToolId: toolId };
  }

  /** 判定并在放行时累计计数；超限不累计；返回本次判定结果与剩余额度 */
  consume(toolId: string, role: string | undefined, now: number): ToolQuotaDecision {
    const decision = this.evaluate(toolId, role, now);
    if (decision.decision !== 'allowed' || decision.policyToolId === undefined) return decision;

    const policy = this.policies.get(toolId)!;
    const key = this.counterKey(toolId, role);
    let entry = this.counters.get(key);
    if (!entry || now - entry.windowStart >= policy.windowMs) {
      entry = { windowStart: now, count: 0 };
      this.counters.set(key, entry);
    }
    entry.count += 1;
    return { ...decision, remaining: policy.limit - entry.count };
  }

  /** 清空策略与计数器（测试 / 进程生命周期使用） */
  reset(): void {
    this.policies.clear();
    this.counters.clear();
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _guard: ToolQuotaGuard | null = null;

/** 获取进程级配额守卫单例 */
export function getToolQuotaGuard(): ToolQuotaGuard {
  if (!_guard) _guard = new ToolQuotaGuard();
  return _guard;
}

/** 测试专用：重置配额守卫单例 */
export function _resetToolQuotaGuard(): void {
  _guard = null;
}
