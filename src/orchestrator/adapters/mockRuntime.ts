/**
 * 健澜科技杠OS - 编排层 Mock 运行时
 *
 * 提供 LLM / RAG / 工具 / 子智能体的确定性 Mock 实现，用于：
 *   1. 单元测试与端到端工作流验证（不依赖真实大模型与外部系统）；
 *   2. 离线产品演示与低代码画布调试；
 *   3. CI 环境的可重复断言。
 *
 * 生产环境请替换为真实适配器（core/agent/LLMClient、knowledge 检索引擎、
 * medical-tools 注册表、AgentInvoker）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type {
  IRagRetriever,
  ISubAgentInvoker,
  IToolInvoker,
  IWorkflowLlm,
  LlmRequest,
  LlmResponse,
  RagChunk,
  RagQuery,
  SubAgentRequest,
  SubAgentResponse,
  ToolInvokeInput,
} from '../engine/runtime.js';
import type { ToolResult } from '../../medical-tools/types.js';

// ============================================================================
// Mock LLM
// ============================================================================

export type MockLlmResponder = string | Record<string, unknown> | ((req: LlmRequest) => string | Record<string, unknown>);

/** 确定性 Mock 大模型：按脚本队列响应，缺省走关键词兜底 */
export class MockWorkflowLlm implements IWorkflowLlm {
  readonly calls: LlmRequest[] = [];
  private queue: MockLlmResponder[] = [];

  /** 预置响应队列（按调用顺序消费） */
  script(...responses: MockLlmResponder[]): this {
    this.queue.push(...responses);
    return this;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    this.calls.push(req);
    const responder = this.queue.shift();
    const raw = responder
      ? typeof responder === 'function'
        ? responder(req)
        : responder
      : this.fallback(req);

    if (typeof raw === 'object') {
      const text = JSON.stringify(raw);
      return { text: req.jsonMode ? text : text, json: raw, tokens: tokenize(req, text), finishReason: 'stop' };
    }
    let json: unknown;
    if (req.jsonMode) {
      try {
        const s = raw.indexOf('{');
        const e = raw.lastIndexOf('}');
        json = JSON.parse(s >= 0 ? raw.slice(s, e + 1) : raw);
      } catch {
        json = undefined;
      }
    }
    return { text: raw, json, tokens: tokenize(req, raw), finishReason: 'stop' };
  }

  /** 兜底：基于提示词关键词产出医疗风格的确定性文本 */
  private fallback(req: LlmRequest): string {
    const user = req.messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ');
    if (req.jsonMode) {
      return JSON.stringify({
        summary: `（演示）基于输入生成的结构化结果：${user.slice(0, 40)}`,
        confidence: 0.86,
        suggestions: ['建议结合临床综合判断', '必要时请上级医师复核'],
      });
    }
    return `（演示模型，非真实医疗建议）已理解任务：${user.slice(0, 60)}。本输出仅用于流程演示，临床决策须由执业医师审核。`;
  }
}

function tokenize(req: LlmRequest, out: string): { input: number; output: number } {
  const input = Math.ceil(req.messages.reduce((n, m) => n + m.content.length, 0) / 3);
  return { input: Math.max(1, input), output: Math.max(1, Math.ceil(out.length / 3)) };
}

// ============================================================================
// Mock RAG
// ============================================================================

export interface MockRagDoc {
  kb: string;
  id: string;
  content: string;
  source: string;
  title?: string;
  authorityLevel?: string;
}

/** 关键词重叠打分的内存检索器 */
export class MockRagRetriever implements IRagRetriever {
  private docs: MockRagDoc[] = [];
  private knowledgeBases = new Set<string>();

  addKnowledgeBase(name: string): this {
    this.knowledgeBases.add(name);
    return this;
  }

  addDoc(doc: MockRagDoc): this {
    this.docs.push(doc);
    this.knowledgeBases.add(doc.kb);
    return this;
  }

  addDocs(docs: MockRagDoc[]): this {
    docs.forEach((d) => this.addDoc(d));
    return this;
  }

  hasKnowledgeBase(name: string): boolean {
    return this.knowledgeBases.has(name);
  }

  async retrieve(query: RagQuery): Promise<RagChunk[]> {
    const terms = tokenizeText(query.query);
    const pool = this.docs.filter(
      (d) => query.knowledgeBases.includes(d.kb) &&
        (!query.authoritativeOnly || (d.authorityLevel ?? 'general') !== 'general'),
    );

    const scored: RagChunk[] = pool.map((d) => {
      const docTerms = tokenizeText(`${d.title ?? ''} ${d.content}`);
      let hit = 0;
      for (const t of terms) if (docTerms.has(t)) hit++;
      const score = terms.size === 0 ? 0 : hit / terms.size;
      return {
        id: d.id,
        content: d.content,
        source: d.source,
        title: d.title,
        authorityLevel: d.authorityLevel,
        score,
      };
    });

    return scored
      .filter((c) => c.score >= query.scoreThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, query.topK);
  }
}

function tokenizeText(text: string): Set<string> {
  // 中文按字二元 + 英文按词，简单稳健
  const cleaned = text.toLowerCase();
  const words = cleaned.match(/[a-z0-9]+/g) ?? [];
  const chars = cleaned.replace(/[^\u4e00-\u9fa5]/g, '');
  const bigrams = new Set(words);
  for (let i = 0; i < chars.length - 1; i++) bigrams.add(chars.slice(i, i + 2));
  if (chars.length === 1) bigrams.add(chars);
  return bigrams;
}

// ============================================================================
// Mock 工具调用
// ============================================================================

export type MockToolHandler = (input: Record<string, unknown>) => ToolResult<unknown> | Promise<ToolResult<unknown>>;

/** 内存 Mock 工具调用器 */
export class MockToolInvoker implements IToolInvoker {
  private handlers = new Map<string, MockToolHandler>();
  private readOnlyTools = new Set<string>();
  private riskLevels = new Map<string, 'low' | 'medium' | 'high'>();
  readonly calls: { toolName: string; input: Record<string, unknown> }[] = [];

  registerTool(
    name: string,
    handler: MockToolHandler,
    opts: { readOnly?: boolean; riskLevel?: 'low' | 'medium' | 'high' } = {},
  ): this {
    this.handlers.set(name, handler);
    if (opts.readOnly) this.readOnlyTools.add(name);
    if (opts.riskLevel) this.riskLevels.set(name, opts.riskLevel);
    return this;
  }

  has(toolName: string): boolean {
    return this.handlers.has(toolName);
  }

  isReadOnly(toolName: string): boolean {
    return this.readOnlyTools.has(toolName);
  }

  riskLevel(toolName: string): 'low' | 'medium' | 'high' | undefined {
    return this.riskLevels.get(toolName);
  }

  async invoke(input: ToolInvokeInput): Promise<ToolResult<unknown>> {
    this.calls.push({ toolName: input.toolName, input: input.input });
    const handler = this.handlers.get(input.toolName);
    if (!handler) {
      return { success: false, error: { code: 'TOOL_NOT_FOUND', message: `Mock 工具不存在: ${input.toolName}` } };
    }
    return handler(input.input);
  }
}

// ============================================================================
// Mock 子智能体
// ============================================================================

export type MockAgentHandler = (req: SubAgentRequest) => SubAgentResponse | Promise<SubAgentResponse>;

/** 内存 Mock 子智能体调用器 */
export class MockSubAgentInvoker implements ISubAgentInvoker {
  private agents = new Map<string, MockAgentHandler>();
  readonly calls: SubAgentRequest[] = [];

  registerAgent(agentId: string, handler?: MockAgentHandler): this {
    this.agents.set(
      agentId,
      handler ??
        (() => ({
          output: { note: `（演示）子智能体 ${agentId} 已处理`, received: true },
          tokens: { input: 20, output: 20 },
        })),
    );
    return this;
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  async invoke(req: SubAgentRequest): Promise<SubAgentResponse> {
    this.calls.push(req);
    const handler = this.agents.get(req.agentId);
    if (!handler) {
      return { output: { error: `子智能体不存在: ${req.agentId}` } };
    }
    return handler(req);
  }
}

/** 构造一套开箱即用的 Mock 运行时（人工任务用 InMemoryHumanTaskHandler 单独注入） */
export function createMockRuntimeDeps(): {
  llm: MockWorkflowLlm;
  rag: MockRagRetriever;
  tools: MockToolInvoker;
  subAgents: MockSubAgentInvoker;
} {
  return {
    llm: new MockWorkflowLlm(),
    rag: new MockRagRetriever(),
    tools: new MockToolInvoker(),
    subAgents: new MockSubAgentInvoker(),
  };
}
