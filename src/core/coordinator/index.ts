/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 超级调度层（Coordinator）统一导出。
 */

export { AgentRegistry } from './AgentRegistry';
export {
  type AgentExecutor,
  type AggregateOptions,
  CollaborationEngine,
} from './CollaborationEngine';
export {
  ConsultationManager,
  type ConsultationOpinion,
  type ConsultationRecord,
  type ConsultationStatus,
} from './ConsultationManager';
export { IntentClassifier, type IntentScore } from './IntentClassifier';
export { SuperScheduler } from './SuperScheduler';
export {
  type AgentLayer,
  type AgentLoad,
  type AgentMetadata,
  type AggregatedResponse,
  type AggregationStrategy,
  type CapabilityTag,
  type ExecutableAgent,
  PRIORITY_WEIGHT,
  type RoutePlan,
  type RouteStrategy,
} from './types';
