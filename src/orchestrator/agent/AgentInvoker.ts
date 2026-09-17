/**
 * 健澜科技杠OS - 智能体调用器
 *
 * 实现编排层 ISubAgentInvoker：加载目标智能体的入口工作流并通过工作流引擎执行，
 * 从而支持智能体嵌套编排与多学科会诊（MDT consultation）。
 *
 * 会话作用域：AgentInvoker 持有的 WorkflowRuntime 中，工具调用上下文提供者
 * 已绑定当前用户/患者，因此子智能体调用天然继承医疗安全上下文（权限/审计/脱敏）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { AgentDefinition } from '../dsl/types.js';
import type {
  ISubAgentInvoker,
  SubAgentRequest,
  SubAgentResponse,
  WorkflowRuntime,
} from '../engine/runtime.js';
import type { WorkflowEngine } from '../engine/engine.js';
import type { AgentRegistry } from './AgentRegistry.js';

/** 调用器构造参数 */
export interface AgentInvokerDeps {
  registry: AgentRegistry;
  engine: WorkflowEngine;
  /** 会话作用域运行时（工具 provider 已绑定当前用户/患者） */
  runtime: WorkflowRuntime;
  /** 患者/用户上下文，透传给子工作流 */
  patient?: Record<string, unknown>;
  user?: Record<string, unknown>;
}

/**
 * 智能体调用器
 */
export class AgentInvoker implements ISubAgentInvoker {
  constructor(private readonly deps: AgentInvokerDeps) {}

  has(agentId: string): boolean {
    return this.deps.registry.has(agentId);
  }

  async invoke(req: SubAgentRequest): Promise<SubAgentResponse> {
    if (req.mode === 'consultation' && req.consultationAgents?.length) {
      return this.runConsultation(req);
    }
    return this.runDelegate(req.agentId, req.version, req.input, req.timeoutMs);
  }

  /** 委派：执行单个智能体入口工作流 */
  private async runDelegate(
    agentId: string,
    version: string | undefined,
    input: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<SubAgentResponse> {
    const agent = this.deps.registry.get(agentId, version);
    if (!agent) {
      return { output: { error: `子智能体不存在: ${agentId}` } };
    }
    const workflow = agent.workflows.find((w) => w.meta.id === agent.entryWorkflow);
    if (!workflow) {
      return { output: { error: `入口工作流不存在: ${agent.entryWorkflow}` } };
    }

    const prompts = this.deps.registry.getPrompts(agentId);
    const instance = this.deps.engine.run(workflow, {
      input,
      patient: this.deps.patient,
      user: this.deps.user,
      timeoutMs,
      trigger: { type: 'subagent', source: agentId },
      runtimeOverride: {
        promptLoader: (ref: string) => prompts[ref] ?? ref,
      },
    });

    const result = await instance.result;
    return {
      output: result.success
        ? result.output
        : { error: result.error, agentId, state: result.state },
      tokens: result.summary.tokens,
    };
  }

  /** 会诊：专家并行给出意见，主智能体汇总 */
  private async runConsultation(req: SubAgentRequest): Promise<SubAgentResponse> {
    const expertIds = [...new Set([...(req.consultationAgents ?? [])])];

    const expertResults = await Promise.all(
      expertIds.map(async (id) => {
        const r = await this.runDelegate(id, undefined, req.input, req.timeoutMs);
        return { agentId: id, output: r.output };
      }),
    );

    const opinions = expertResults.filter((o) => !o.output || !(o.output as { error?: string }).error);

    // 主智能体在收到专家意见后汇总
    const main = await this.runDelegate(
      req.agentId,
      req.version,
      { ...req.input, expertOpinions: opinions },
      req.timeoutMs,
    );

    return {
      output: main.output,
      tokens: main.tokens,
      opinions,
    };
  }

  /** 便捷：直接运行某智能体（供 BFF/触发器调用，非子智能体场景） */
  async run(
    agent: AgentDefinition,
    input: Record<string, unknown>,
    options: { timeoutMs?: number; trigger?: 'manual' | 'api' | 'event' | 'schedule' } = {},
  ): Promise<SubAgentResponse> {
    const workflow = agent.workflows.find((w) => w.meta.id === agent.entryWorkflow);
    if (!workflow) return { output: { error: `入口工作流不存在: ${agent.entryWorkflow}` } };

    const prompts = this.deps.registry.getPrompts(agent.id);
    const instance = this.deps.engine.run(workflow, {
      input,
      patient: this.deps.patient,
      user: this.deps.user,
      timeoutMs: options.timeoutMs,
      trigger: { type: options.trigger ?? 'api' },
      runtimeOverride: { promptLoader: (ref: string) => prompts[ref] ?? ref },
    });
    const result = await instance.result;
    return {
      output: result.success ? result.output : { error: result.error, state: result.state },
      tokens: result.summary.tokens,
    };
  }
}
