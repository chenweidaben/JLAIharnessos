/**
 * 健澜科技 jlmedaios - 规则质控可视化配置 V14 聚合器（M461-B）
 *
 * 与 configurableQcRules.ts 的"后端硬编码规则"不同，本聚合器供前端可视化配置：
 *  - 列出规则（id/name/category/severity/enabled/weight）
 *  - 切换启用/停用
 *  - 调整权重（0-100 clamp）
 *
 * 纯函数、无 I/O、可重复。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 规则质控可视化配置项 */
export interface QcRuleConfigV14 {
  ruleId: string;
  name: string;
  category: string;
  severity: string;
  enabled: boolean;
  weight: number;
}

/** 默认内置规则集（CR-001 起编号，与 configurableQcRules.ts 对齐但前端可配置） */
export const DEFAULT_QC_RULE_CONFIG_V14: QcRuleConfigV14[] = [
  { ruleId: "CR-001", name: "首页诊断缺失", category: "homepage", severity: "block", enabled: true, weight: 100 },
  { ruleId: "CR-002", name: "首页入院日期缺失", category: "homepage", severity: "major", enabled: true, weight: 80 },
  { ruleId: "CR-003", name: "作者签名缺失", category: "basic", severity: "major", enabled: true, weight: 80 },
  { ruleId: "CR-004", name: "全文过短", category: "basic", severity: "block", enabled: true, weight: 100 },
  { ruleId: "CR-005", name: "主诉缺失", category: "intrinsic", severity: "major", enabled: true, weight: 60 },
  { ruleId: "CR-006", name: "住院号缺失", category: "warning", severity: "minor", enabled: true, weight: 30 },
];

/**
 * 返回规则列表。
 *
 * @param rules 规则数组（缺省使用默认内置）
 * @returns 规则列表
 */
export function computeQcRuleConfigListV14(rules?: QcRuleConfigV14[]): QcRuleConfigV14[] {
  return rules ?? DEFAULT_QC_RULE_CONFIG_V14;
}

/**
 * 切换启用/停用。
 *
 * @param rules 规则数组
 * @param ruleId 目标规则 ID
 * @param enabled 目标启用状态
 * @returns 切换后的列表 + changedCount
 */
export function computeQcRuleConfigToggleV14(
  rules: QcRuleConfigV14[],
  ruleId: string,
  enabled: boolean,
): { list: QcRuleConfigV14[]; changedCount: number } {
  let changedCount = 0;
  const list = rules.map((r) => {
    if (r.ruleId === ruleId) {
      changedCount += 1;
      return { ...r, enabled };
    }
    return r;
  });
  return { list, changedCount };
}

/**
 * 调整权重（clamp 0-100）。
 *
 * @param rules 规则数组
 * @param ruleId 目标规则 ID
 * @param weight 目标权重
 * @returns 调整后的列表 + clamp 后的 weight
 */
export function computeQcRuleConfigWeightV14(
  rules: QcRuleConfigV14[],
  ruleId: string,
  weight: number,
): { list: QcRuleConfigV14[]; weight: number } {
  const clamped = Math.max(0, Math.min(100, weight));
  const list = rules.map((r) => (r.ruleId === ruleId ? { ...r, weight: clamped } : r));
  return { list, weight: clamped };
}
