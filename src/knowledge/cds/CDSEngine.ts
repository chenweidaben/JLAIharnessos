/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 规则引擎
 * ---------------------------------------------------------------------------
 * 负责规则的加载与管理、逐条规则执行、冲突解决（优先级 + 互斥组）、
 * 执行结果聚合。引擎本身不绑定具体 Agent，可被工具调用、主动提醒、
 * 拦截确认等多种集成方式复用。
 *
 * 免责声明：所有 CDS 结果仅供参考，最终决策须由执业医师确认。
 */

import { ActionExecutor } from './ActionExecutor.js';
import type {
  AlertLevel,
  CdsExecutionResult,
  CdsFacts,
  CdsRule,
  CdsRuleType,
  RuleHit,
  TriggerEvent,
} from './Rule.js';
import { RuleEvaluator } from './RuleEvaluator.js';

/** 提醒级别严重度排序（用于取最高级别） */
const LEVEL_ORDER = { info: 1, warning: 2, critical: 3 } as const;

/**
 * CDS 规则引擎
 *
 * @example
 * ```typescript
 * const engine = new CDSEngine();
 * engine.registerRules([...drugRules, ...labRules]);
 * const result = engine.run(facts, 'prescription_create');
 * if (!result.passed) console.warn(result.hits);
 * ```
 */
export class CDSEngine {
  private readonly rules = new Map<string, CdsRule>();
  private readonly evaluator: RuleEvaluator;
  private readonly actionExecutor: ActionExecutor;

  constructor(options?: { evaluator?: RuleEvaluator; actionExecutor?: ActionExecutor }) {
    this.evaluator = options?.evaluator ?? new RuleEvaluator();
    this.actionExecutor = options?.actionExecutor ?? new ActionExecutor();
  }

  // ==========================================================================
  // 规则加载与管理
  // ==========================================================================

  /** 注册单条规则（同 ID 覆盖） */
  registerRule(rule: CdsRule): void {
    this.rules.set(rule.id, rule);
  }

  /** 批量注册规则 */
  registerRules(rules: readonly CdsRule[]): void {
    for (const rule of rules) this.registerRule(rule);
  }

  /** 按 ID 获取规则 */
  getRule(id: string): CdsRule | undefined {
    return this.rules.get(id);
  }

  /** 列出全部规则（可按类型过滤） */
  listRules(ruleType?: CdsRuleType): CdsRule[] {
    const all = Array.from(this.rules.values());
    return ruleType ? all.filter((r) => r.ruleType === ruleType) : all;
  }

  /** 启用规则 */
  enableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) this.rules.set(id, { ...rule, status: 'enabled' });
  }

  /** 禁用规则 */
  disableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) this.rules.set(id, { ...rule, status: 'disabled' });
  }

  /** 移除规则 */
  removeRule(id: string): void {
    this.rules.delete(id);
  }

  /** 规则总数 */
  get size(): number {
    return this.rules.size;
  }

  // ==========================================================================
  // 规则执行
  // ==========================================================================

  /**
   * 对患者事实执行规则集。
   *
   * @param facts 患者事实上下文
   * @param triggerEvent 触发事件（仅执行订阅该事件或 manual 的规则）
   * @returns 聚合后的 CDS 执行结果
   */
  run(facts: CdsFacts, triggerEvent: TriggerEvent): CdsExecutionResult {
    // 1. 筛选候选规则：已启用/测试态，且订阅当前事件
    const candidates = this.listApplicable(triggerEvent);

    const triggered: RuleHit[] = [];
    let suppressedCount = 0;

    // 2. 逐条评估
    for (const rule of candidates) {
      const excluded =
        rule.exclusions !== undefined && this.evaluator.evaluate(rule.exclusions, facts);
      if (excluded) continue;

      const fired = this.evaluator.evaluate(rule.condition, facts);
      if (!fired) continue;

      // 测试态规则只记录，不进入拦截/提醒聚合
      if (rule.status === 'test') {
        continue;
      }
      triggered.push(this.actionExecutor.execute(rule, facts));
    }

    // 3. 冲突解决：按优先级降序；互斥组内仅保留最高优先级
    triggered.sort((a, b) => b.priority - a.priority);
    const hits = this.resolveMutualExclusion(triggered);
    suppressedCount = triggered.length - hits.length;

    // 4. 聚合结果
    const passed = !hits.some((h) => h.actionType === 'block' && h.requireOverride);
    const maxLevel = hits.reduce<AlertLevel | null>((acc, h) => {
      if (acc === null) return h.level;
      return LEVEL_ORDER[h.level] > LEVEL_ORDER[acc] ? h.level : acc;
    }, null);

    return {
      passed,
      maxLevel,
      hits,
      suppressedCount,
      evaluatedRules: candidates.length,
      evaluatedAt: new Date().toISOString(),
      disclaimer: '本CDS结果仅供参考，不替代临床判断，需医生确认',
    };
  }

  /** 筛选当前事件下可执行的规则 */
  private listApplicable(triggerEvent: TriggerEvent): CdsRule[] {
    return this.listRules().filter(
      (rule) =>
        (rule.status === 'enabled' || rule.status === 'test') &&
        (rule.triggerEvents.includes(triggerEvent) || rule.triggerEvents.includes('manual')),
    );
  }

  /**
   * 互斥解决：同一 mutualExclusionGroup 内仅保留优先级最高的一条。
   * 入参已按优先级降序排序。
   */
  private resolveMutualExclusion(hits: RuleHit[]): RuleHit[] {
    const kept: RuleHit[] = [];
    const seenGroups = new Set<string>();

    for (const hit of hits) {
      const rule = this.rules.get(hit.ruleId);
      const group = rule?.mutualExclusionGroup;
      if (group) {
        if (seenGroups.has(group)) continue;
        seenGroups.add(group);
      }
      kept.push(hit);
    }
    return kept;
  }
}
