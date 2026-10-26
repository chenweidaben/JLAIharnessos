/**
 * 健澜AI原生医院操作系统OS - security/ai/index.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * AI 专项安全模块统一导出：输出侧校验器（五道防线第四道）。
 *
 * @module security/ai
 */

export {
  OutboundGuard,
  guardOutbound,
  type OutboundGuardConfig,
} from './outputGuard';

export type {
  AgentRiskLevel,
  AgentRole,
  EvidenceLevel,
  OutboundLevel,
  FindingSeverity,
  GuardRuleId,
  FactSnapshot,
  CitationRef,
  OutboundContext,
  GuardFinding,
  OutboundVerdict,
} from './types';
