/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 与 Agent 集成层
 * ---------------------------------------------------------------------------
 * 把 CDSEngine 接入临床工作流：
 *   - 开医嘱/处方时自动触发 CDS 检查（主动提醒）
 *   - 高风险操作（block）需医生确认后 override 才能继续（拦截确认）
 *   - 把 CDS 结果注入 Agent 上下文（作为 tool_result / system 提示）
 */

import { CDSEngine } from './CDSEngine.js';
import type { CdsExecutionResult, CdsFacts, CdsRule, TriggerEvent } from './Rule.js';
import { ALL_CDS_RULES, RULESET_VERSION } from './rules/ruleIndex.js';

/** 医生 override 高风险拦截时提交的信息 */
export interface CdsOverrideDecision {
  /** 被 override 的规则ID */
  readonly ruleId: string;
  /** 是否确认 override（继续操作） */
  readonly confirmed: boolean;
  /** 选择的理由 */
  readonly reason?: string;
  /** 医生ID */
  readonly doctorId: string;
}

/** 注入 Agent 上下文的 CDS 摘要 */
export interface CdsContextInjection {
  readonly triggered: boolean;
  readonly maxLevel: string | null;
  /** 可直接拼接到 system / tool 提示文本 */
  readonly promptSnippet: string;
  readonly hits: readonly { ruleId: string; title: string; level: string; message: string }[];
}

/**
 * CDS 集成层：面向 Agent 工作流的门面。
 *
 * @example
 * ```typescript
 * const integration = new CDSIntegration();
 * const result = integration.checkBeforeOrder(facts);
 * if (!result.passed) {
 *   // 弹确认框，医生 override 后继续
 * }
 * ```
 */
export class CDSIntegration {
  private readonly engine: CDSEngine;
  /** 已记录的 override 历史（审计） */
  private overrideLog: CdsOverrideDecision[] = [];

  constructor(engine?: CDSEngine) {
    this.engine = engine ?? new CDSEngine();
    this.engine.registerRules(ALL_CDS_RULES);
  }

  /** 暴露底层引擎（便于注册自定义规则） */
  getEngine(): CDSEngine {
    return this.engine;
  }

  /** 规则库版本 */
  get rulesetVersion(): string {
    return RULESET_VERSION;
  }

  /**
   * 开医嘱前 CDS 检查（主动提醒）。
   * 等同于 run(facts, 'order_create')。
   */
  checkBeforeOrder(facts: CdsFacts): CdsExecutionResult {
    return this.engine.run(facts, 'order_create');
  }

  /**
   * 开处方前 CDS 检查（主动提醒）。
   */
  checkBeforePrescription(facts: CdsFacts): CdsExecutionResult {
    return this.engine.run(facts, 'prescription_create');
  }

  /**
   * 检验结果到达时的危急值检查。
   */
  checkLabResult(facts: CdsFacts): CdsExecutionResult {
    return this.engine.run(facts, 'lab_result_report');
  }

  /**
   * 病历书写时的规范符合度检查。
   */
  checkDuringRecordWrite(facts: CdsFacts): CdsExecutionResult {
    return this.engine.run(facts, 'record_write');
  }

  /**
   * 通用检查入口。
   *
   * @param facts 患者事实
   * @param event 触发事件
   */
  run(facts: CdsFacts, event: TriggerEvent): CdsExecutionResult {
    return this.engine.run(facts, event);
  }

  /**
   * 拦截确认机制：当存在 block 级规则时，需医生 override。
   *
   * @param result 已执行的 CDS 结果
   * @param overrides 医生对各 block 规则的 override 决定
   * @returns 是否允许继续操作
   */
  resolveOverrides(result: CdsExecutionResult, overrides: readonly CdsOverrideDecision[]): boolean {
    this.overrideLog.push(...overrides);

    const blockedRules = result.hits.filter((h) => h.actionType === 'block' && h.requireOverride);
    if (blockedRules.length === 0) return true;

    // 每条 block 规则都必须有 confirmed=true 的 override
    for (const blocked of blockedRules) {
      const decision = overrides.find((o) => o.ruleId === blocked.ruleId);
      if (!decision?.confirmed) {
        return false;
      }
    }
    return true;
  }

  /**
   * 把 CDS 结果转换为可注入 Agent 上下文的提示片段。
   */
  buildContextInjection(result: CdsExecutionResult): CdsContextInjection {
    const hits = result.hits.map((h) => ({
      ruleId: h.ruleId,
      title: h.title,
      level: h.level,
      message: h.message,
    }));

    const lines = result.hits.map((h) => `[${h.level.toUpperCase()}] ${h.title}：${h.message}`);
    const promptSnippet =
      result.hits.length === 0
        ? 'CDS 检查未触发规则。'
        : `CDS 触发 ${result.hits.length} 条规则（${result.maxLevel ?? 'info'}）：\n- ${lines.join('\n- ')}\n注意：以上 CDS 结果仅供参考，最终决策需医生确认。`;

    return {
      triggered: result.hits.length > 0,
      maxLevel: result.maxLevel,
      promptSnippet,
      hits,
    };
  }

  /** 审计：override 历史（只读副本） */
  getOverrideHistory(): readonly CdsOverrideDecision[] {
    return this.overrideLog;
  }

  /** 当前已加载规则数量 */
  get loadedRuleCount(): number {
    return this.engine.size;
  }

  /** 获取某条规则元数据 */
  getRule(id: string): CdsRule | undefined {
    return this.engine.getRule(id);
  }
}
