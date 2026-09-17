/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 规则引擎统一导出
 */

// 核心模型
export type {
  AlertLevel,
  CdsActionType,
  CdsExecutionResult,
  CdsFacts,
  CdsLabValue,
  CdsRule,
  CdsRuleType,
  ComparisonOperator,
  ConditionGroup,
  ConditionLeaf,
  ConditionNode,
  EvidenceSource,
  RuleAction,
  RuleHit,
  RuleStatus,
  TriggerEvent,
} from './Rule.js';

// 引擎与评估器
export { ActionExecutor } from './ActionExecutor.js';
export { CDSEngine } from './CDSEngine.js';
export { RuleEvaluator } from './RuleEvaluator.js';

// 集成层
export type { CdsContextInjection, CdsOverrideDecision } from './CDSIntegration.js';
export { CDSIntegration } from './CDSIntegration.js';

// 规则库
export { diagnosisRules } from './rules/diagnosisRules.js';
export { drugRules } from './rules/drugRules.js';
export { labRules } from './rules/labRules.js';
export {
  ALL_CDS_RULES,
  countRulesByType,
  RULESET_VERSION,
  TOTAL_RULE_COUNT,
} from './rules/ruleIndex.js';
