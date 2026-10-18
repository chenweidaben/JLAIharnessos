/**
 * 健澜科技 jlmedaios - 病历质控规则引擎可视化对接 V14 聚合器（M467-A）
 *
 * 纯函数：规则逐条匹配 + 汇总统计。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控规则 */
export interface QcRuleV14 {
  ruleId: string;
  keyword: string;
  message: string;
}

/** 单条规则执行结果 */
export interface RuleExecutionResultV14 {
  ruleId: string;
  triggered: boolean;
  message: string;
}

/** 规则汇总 */
export interface RuleSummaryV14 {
  total: number;
  triggeredCount: number;
  passRate: number;
}

/**
 * 逐条规则匹配病历文本（includes 关键词即触发）。
 *
 * @param note 病历文本
 * @param rules 规则列表
 * @returns 执行结果列表
 */
export function executeRuleEngine(note: string, rules: QcRuleV14[]): RuleExecutionResultV14[] {
  return rules.map((rule) => ({
    ruleId: rule.ruleId,
    triggered: note.includes(rule.keyword),
    message: rule.message,
  }));
}

/**
 * 汇总执行结果：触发数/总数×100 = 通过率。
 *
 * @param results 执行结果列表
 * @returns 汇总统计
 */
export function buildRuleSummary(results: RuleExecutionResultV14[]): RuleSummaryV14 {
  const total = results.length;
  const triggeredCount = results.filter((r) => r.triggered).length;
  const passRate = total > 0 ? Math.round((triggeredCount / total) * 100) : 0;
  return { total, triggeredCount, passRate };
}
