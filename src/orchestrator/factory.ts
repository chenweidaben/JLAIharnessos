/**
 * 健澜科技杠OS - 编排层一键装配工厂
 *
 * createOrchestrator：用真实运行时（医疗工具/核心 LLM/知识检索）装配完整编排能力；
 * createMockOrchestrator：用确定性 Mock 运行时装配，供离线演示、CI 与单元测试。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { WorkflowRuntime } from './engine/runtime.js';
import { WorkflowEngine } from './engine/engine.js';
import { createReferenceResolver } from './engine/resolver.js';
import { InMemoryHumanTaskHandler } from './engine/humanTaskHandler.js';
import { AgentRegistry } from './agent/AgentRegistry.js';
import { AgentInvoker } from './agent/AgentInvoker.js';
import { TriggerManager } from './trigger/TriggerManager.js';
import { AgentPackManager } from './pack/AgentPackManager.js';
import { createMockRuntimeDeps } from './adapters/mockRuntime.js';

/** 装配后的编排能力集合 */
export interface Orchestrator {
  engine: WorkflowEngine;
  registry: AgentRegistry;
  invoker: AgentInvoker;
  packManager: AgentPackManager;
  triggerManager: TriggerManager;
  runtime: WorkflowRuntime;
  humanHandler: InMemoryHumanTaskHandler;
}

/** 装配参数 */
export interface OrchestratorDeps {
  /** 完整运行时（若 human 未提供，将补充进程内人工任务处理器） */
  runtime: WorkflowRuntime;
  /** 复用已有智能体注册中心 */
  registry?: AgentRegistry;
  /** 会话患者上下文 */
  patient?: Record<string, unknown>;
  /** 会话用户上下文 */
  user?: Record<string, unknown>;
}

/** 用真实/自定义运行时装配编排层 */
export function createOrchestrator(deps: OrchestratorDeps): Orchestrator {
  const registry = deps.registry ?? new AgentRegistry();
  const runtime: WorkflowRuntime = {
    ...deps.runtime,
    human: deps.runtime.human ?? new InMemoryHumanTaskHandler(),
  };
  const humanHandler = runtime.human as InMemoryHumanTaskHandler;

  const resolver = createReferenceResolver({
    tools: runtime.tools,
    rag: runtime.rag,
    agents: registry,
  });
  const engine = new WorkflowEngine({ runtime, resolver });

  const invoker = new AgentInvoker({
    registry,
    engine,
    runtime,
    patient: deps.patient,
    user: deps.user,
  });

  const triggerManager = new TriggerManager(async (agent, input, trigger) =>
    invoker.run(agent, input, { trigger: trigger.type }),
  );
  const packManager = new AgentPackManager(registry);

  return {
    engine,
    registry,
    invoker,
    packManager,
    triggerManager,
    runtime,
    humanHandler,
  };
}

/** Mock 装配结果（含可脚本化的 Mock 依赖） */
export interface MockOrchestrator extends Orchestrator {
  mocks: ReturnType<typeof createMockRuntimeDeps>;
}

/** 用确定性 Mock 运行时装配（测试/离线演示） */
export function createMockOrchestrator(): MockOrchestrator {
  const mocks = createMockRuntimeDeps();
  const humanHandler = new InMemoryHumanTaskHandler();
  const runtime: WorkflowRuntime = {
    llm: mocks.llm,
    rag: mocks.rag,
    tools: mocks.tools,
    subAgents: mocks.subAgents,
    human: humanHandler,
  };
  const orch = createOrchestrator({ runtime });
  return { ...orch, mocks };
}
