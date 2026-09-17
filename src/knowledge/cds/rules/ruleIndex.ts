/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 规则索引与统一注册
 * ---------------------------------------------------------------------------
 * 汇总药物、检验、诊疗规范三类规则，提供一键装载到 CDSEngine 的能力。
 */

import type { CdsRule } from '../Rule.js';
import { diagnosisRules } from './diagnosisRules.js';
import { drugRules } from './drugRules.js';
import { labRules } from './labRules.js';

/** 全部内置 CDS 规则（药物 + 检验 + 诊疗规范） */
export const ALL_CDS_RULES: readonly CdsRule[] = [...drugRules, ...labRules, ...diagnosisRules];

/** 规则库版本（语义化版本，支持回滚与A/B测试） */
export const RULESET_VERSION = '1.0.0';

/**
 * 按规则类型统计规则数量
 */
export function countRulesByType(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const rule of ALL_CDS_RULES) {
    stats[rule.ruleType] = (stats[rule.ruleType] ?? 0) + 1;
  }
  return stats;
}

/** 规则总数 */
export const TOTAL_RULE_COUNT = ALL_CDS_RULES.length;
