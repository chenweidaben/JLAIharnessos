/**
 * 健澜科技杠OS - 智能体编排层（Orchestration Layer）
 *
 * 编排层是"医疗 AI 安卓"的核心：医院信息科与开发者通过声明式 DSL（YAML/JSON）
 * 或低代码画布即可组装智能体，无需编写过程式代码。它提供：
 *   - 声明式工作流 DSL（12 类节点：LLM/工具/RAG/条件/循环/并行/人工/子智能体…）；
 *   - 安全表达式沙箱（自研递归下降解析，杜绝 eval 注入与原型链攻击）；
 *   - DAG 校验、状态机、断点重试、人工挂起恢复、并行编排、超时与降级；
 *   - 智能体注册/版本/包导入导出（开源市场）、四类触发器、MDT 会诊；
 *   - 与 36 个医疗工具、知识中台、核心 LLM 客户端的标准适配器。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// DSL 类型与校验
export * from './dsl/types.js';
export * from './dsl/schema.js';
export * from './dsl/loader.js';

// 安全表达式
export {
  evaluateExpression,
  evaluateCondition,
  validateExpression,
  renderTemplate,
  parseExpression,
  ExpressionError,
} from './engine/expression.js';

// 工作流上下文 / 状态机 / 校验 / 记录
export { WorkflowContext } from './engine/context.js';
export type { NodeRecord, TriggerInfo } from './engine/context.js';
export { WorkflowStateMachine, IllegalStateTransitionError } from './engine/state.js';
export {
  validateWorkflow,
  topologicalSort,
  NULL_REFERENCE_RESOLVER,
} from './engine/validator.js';
export type { ReferenceResolver } from './engine/validator.js';
export { ExecutionRecorder, ExecutionEventType } from './engine/recorder.js';
export type { ExecutionEvent, ExecutionSummary } from './engine/recorder.js';

// 运行时 SPI
export type {
  IWorkflowLlm,
  IRagRetriever,
  IToolInvoker,
  IHumanTaskHandler,
  ISubAgentInvoker,
  WorkflowRuntime,
  LlmRequest,
  LlmResponse,
  LlmMessage,
  RagQuery,
  RagChunk,
  ToolInvokeInput,
  PendingHumanTask,
  HumanResolution,
  SubAgentRequest,
  SubAgentResponse,
} from './engine/runtime.js';
export { defaultSleep } from './engine/runtime.js';
export {
  InMemoryHumanTaskHandler,
  HumanTaskTimeoutError,
  HumanTaskCancelledError,
} from './engine/humanTaskHandler.js';

// 引擎
export {
  WorkflowEngine,
  WorkflowExecutionError,
} from './engine/engine.js';
export type {
  WorkflowRunOptions,
  WorkflowRunResult,
  WorkflowInstance,
} from './engine/engine.js';
export { createReferenceResolver } from './engine/resolver.js';

// 节点
export { NodeExecutorRegistry, getDefaultNodeExecutorRegistry } from './nodes/registry.js';
export type {
  NodeExecutor,
  NodeExecutorContext,
  NodeOutcome,
  PathRunner,
  PathRunResult,
} from './nodes/types.js';

// 智能体注册与调用
export { AgentRegistry, compareSemVer } from './agent/AgentRegistry.js';
export type { AgentQuery } from './agent/AgentRegistry.js';
export { AgentInvoker } from './agent/AgentInvoker.js';
export type { AgentInvokerDeps } from './agent/AgentInvoker.js';

// 触发器与包管理
export { TriggerManager, cronMatches, cronFieldMatches } from './trigger/TriggerManager.js';
export type { TriggerRunner } from './trigger/TriggerManager.js';
export { AgentPackManager, PACKAGE_FORMAT_VERSION } from './pack/AgentPackManager.js';
export type { ExportOptions, ImportResult } from './pack/AgentPackManager.js';
export {
  loadAgentPackageFromDir,
  loadAllAgentsFromDir,
  loadAndRegisterAgents,
} from './pack/directoryLoader.js';
export type { LoadedAgentDir } from './pack/directoryLoader.js';

// 适配器
export { MedicalToolInvoker } from './adapters/medicalToolAdapter.js';
export type { MedicalContextProvider } from './adapters/medicalToolAdapter.js';
export { CoreLlmAdapter, resolveModelAlias } from './adapters/llmAdapter.js';
export { RetrievalEngineRagAdapter } from './adapters/ragAdapter.js';
export { VoiceAsrToolInvoker, CompositeToolInvoker, TRANSCRIBE_VOICE_TOOL } from './adapters/voiceAsrToolAdapter.js';
export {
  MockWorkflowLlm,
  MockRagRetriever,
  MockToolInvoker,
  MockSubAgentInvoker,
  createMockRuntimeDeps,
} from './adapters/mockRuntime.js';
export type { MockLlmResponder, MockRagDoc, MockToolHandler } from './adapters/mockRuntime.js';

// 一键装配
export { createOrchestrator, createMockOrchestrator } from './factory.js';
export type { Orchestrator, OrchestratorDeps, MockOrchestrator } from './factory.js';
