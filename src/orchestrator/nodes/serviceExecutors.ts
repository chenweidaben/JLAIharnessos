/**
 * 健澜科技杠OS - 服务类节点执行器
 *
 * 包含：llm（大模型）、rag（知识检索）、tool（医疗工具）、human（人工审核）、subagent（子智能体）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { WorkflowNodeType, type NodeDefinition } from '../dsl/types.js';
import type { NodeExecutor, NodeExecutorContext, NodeOutcome } from './types.js';
import { assertNotCancelled, WorkflowCancelledError } from './types.js';
import type { RagChunk } from '../engine/runtime.js';

/** 解析提示词：文件引用（prompts/xx.md）走加载器，否则视为内联文本 */
async function resolvePrompt(refOrText: string | undefined, nc: NodeExecutorContext): Promise<string> {
  if (!refOrText) return '';
  if (refOrText.startsWith('prompts/') && nc.runtime.promptLoader) {
    return nc.runtime.promptLoader(refOrText);
  }
  // 内联文本同样做模板渲染
  return nc.ctx.render(refOrText);
}

/** 从 LLM 文本中提取 JSON（兼容 ```json 代码块包裹） */
function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('模型未返回有效 JSON 对象');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

// ============================================================================
// LLM 节点
// ============================================================================

export class LlmNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.LLM;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      model: string;
      temperature?: number;
      topP?: number;
      maxTokens?: number;
      stream?: boolean;
      systemPrompt?: string;
      userTemplate: string;
      knowledgeBase?: string;
      jsonMode?: boolean;
    };

    try {
      const system = await resolvePrompt(cfg.systemPrompt, nc);
      let userContent = nc.ctx.render(cfg.userTemplate);

      // 绑定知识库：自动检索并以"引用证据"形式注入（RAG）
      let retrieved: RagChunk[] = [];
      if (cfg.knowledgeBase) {
        retrieved = await nc.runtime.rag.retrieve({
          knowledgeBases: [cfg.knowledgeBase],
          query: userContent,
          topK: 6,
          scoreThreshold: 0.35,
          strategy: 'hybrid',
          authoritativeOnly: false,
        });
        if (retrieved.length > 0) {
          const evidence = retrieved
            .map((c, i) => `[${i + 1}] ${c.content}（来源：${c.source}）`)
            .join('\n');
          userContent =
            `请优先参考以下权威医学资料，并在结论中以[n]标注引用：\n${evidence}\n\n` +
            `问题/任务：${userContent}`;
        }
      }

      const resp = await nc.runtime.llm.complete({
        model: cfg.model,
        messages: [
          ...(system ? [{ role: 'system' as const, content: system }] : []),
          { role: 'user' as const, content: userContent },
        ],
        temperature: cfg.temperature ?? 0.2,
        topP: cfg.topP,
        maxTokens: cfg.maxTokens,
        stream: cfg.stream,
        jsonMode: cfg.jsonMode,
        traceId: nc.ctx.trigger.traceId,
      });

      let json: unknown;
      if (cfg.jsonMode) {
        try {
          json = extractJson(resp.text);
        } catch (e) {
          return { status: 'failed', error: `JSON 模式解析失败: ${(e as Error).message}`, tokens: resp.tokens };
        }
      }

      return {
        status: 'completed',
        selectedPort: 'out',
        tokens: resp.tokens,
        output: {
          text: resp.text,
          json,
          evidence: retrieved.map((c) => ({ source: c.source, title: c.title, score: c.score })),
        },
      };
    } catch (e) {
      if (e instanceof WorkflowCancelledError) throw e;
      return { status: 'failed', error: `LLM 调用失败: ${(e as Error).message}` };
    }
  }
}

// ============================================================================
// RAG 知识检索节点
// ============================================================================

export class RagNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.RAG;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      knowledgeBases: string[];
      query: string;
      topK: number;
      scoreThreshold: number;
      strategy: 'vector' | 'keyword' | 'hybrid';
      authoritativeOnly?: boolean;
      outputVariable: string;
    };

    try {
      // query 既支持纯表达式（input.q）也支持模板（"关于${input.topic}的指南"）
      const rawQuery = cfg.query;
      const query = rawQuery.includes('${')
        ? nc.ctx.render(rawQuery)
        : String(nc.ctx.evaluate(rawQuery) ?? '');
      const chunks = await nc.runtime.rag.retrieve({
        knowledgeBases: cfg.knowledgeBases,
        query,
        topK: cfg.topK,
        scoreThreshold: cfg.scoreThreshold,
        strategy: cfg.strategy,
        authoritativeOnly: cfg.authoritativeOnly,
      });

      const context = chunks
        .map((c, i) => `[${i + 1}] ${c.content}（来源：${c.source}）`)
        .join('\n\n');

      const output = {
        query,
        chunks,
        context,
        sources: chunks.map((c) => c.source),
        count: chunks.length,
      };
      // 写入指定变量，供后续节点引用
      if (cfg.outputVariable) {
        nc.ctx.setVariable(cfg.outputVariable, output);
      }
      return { status: 'completed', output, selectedPort: 'out' };
    } catch (e) {
      return { status: 'failed', error: `知识检索失败: ${(e as Error).message}` };
    }
  }
}

// ============================================================================
// 医疗工具节点
// ============================================================================

export class ToolNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.TOOL;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      toolName: string;
      inputMapping: Record<string, string>;
      riskLevel?: 'low' | 'medium' | 'high';
      requireConfirmation?: boolean;
      requireDoubleConfirm?: boolean;
      readOnly?: boolean;
    };

    if (!nc.runtime.tools.has(cfg.toolName)) {
      return { status: 'failed', error: `医疗工具不存在: ${cfg.toolName}` };
    }

    try {
      const input = nc.ctx.applyMapping(cfg.inputMapping ?? {});
      const result = await nc.runtime.tools.invoke({
        toolName: cfg.toolName,
        input,
        riskLevel: cfg.riskLevel ?? nc.runtime.tools.riskLevel(cfg.toolName),
        requireConfirmation: cfg.requireConfirmation,
        requireDoubleConfirm: cfg.requireDoubleConfirm,
        readOnly: cfg.readOnly ?? nc.runtime.tools.isReadOnly(cfg.toolName),
      });

      if (!result.success) {
        return {
          status: 'failed',
          error: result.error ? `${result.error.code}: ${result.error.message}` : '工具执行失败',
          output: result,
        };
      }
      return { status: 'completed', output: result.data, selectedPort: 'out' };
    } catch (e) {
      if (e instanceof WorkflowCancelledError) throw e;
      return { status: 'failed', error: `工具 ${cfg.toolName} 执行异常: ${(e as Error).message}` };
    }
  }
}

// ============================================================================
// 人工审核节点
// ============================================================================

export class HumanNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.HUMAN;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      title: string;
      instructions: string;
      assigneeRoles: string[];
      assigneeUserIds?: string[];
      formSchema?: Record<string, unknown>;
      timeoutMs?: number;
    };

    const taskId = nc.createHumanTaskId();
    // 审核上下文：取最近若干节点输出（已由工具层脱敏）
    const reviewData = nc.ctx.getAllRecords().slice(-3).map((r) => ({
      nodeId: r.nodeId,
      state: r.state,
      output: r.output,
    }));

    const task = {
      taskId,
      instanceId: nc.instanceId,
      nodeId: node.id,
      title: nc.ctx.render(cfg.title),
      instructions: nc.ctx.render(cfg.instructions),
      assigneeRoles: cfg.assigneeRoles,
      assigneeUserIds: cfg.assigneeUserIds,
      formSchema: cfg.formSchema,
      reviewData,
      timeoutMs: cfg.timeoutMs,
      createdAt: Date.now(),
    };

    await nc.runtime.human.createTask(task);

    // 通知引擎：工作流进入"等待人工"状态（用于状态机迁移与持久化）
    nc.runtime.onEvent?.({ type: 'human_waiting', task, nodeId: node.id });

    // 挂起等待人工处理；取消信号通过 Promise.race 生效
    const resolution = await Promise.race([
      nc.runtime.human.waitForResolution(task),
      new Promise<never>((_, reject) => {
        if (nc.signal.aborted) reject(new WorkflowCancelledError());
        nc.signal.addEventListener('abort', () => reject(new WorkflowCancelledError()), { once: true });
      }),
    ]);

    // 通知引擎：人工任务已处理，工作流恢复运行
    nc.runtime.onEvent?.({ type: 'human_resolved', taskId, resolution, nodeId: node.id });

    // 审核意见/表单写入变量，供后续 condition 节点判断 approved
    if (resolution.formData) nc.ctx.mergeVariables(resolution.formData);

    return {
      status: 'completed',
      selectedPort: 'out',
      output: {
        approved: resolution.approved,
        comment: resolution.comment,
        reviewerId: resolution.reviewerId,
        formData: resolution.formData,
      },
    };
  }
}

// ============================================================================
// 子智能体节点
// ============================================================================

export class SubagentNodeExecutor implements NodeExecutor {
  readonly type = WorkflowNodeType.SUBAGENT;

  async execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome> {
    assertNotCancelled(nc.signal);
    const cfg = node.config as {
      agentId: string;
      version?: string;
      inputMapping: Record<string, unknown>;
      mode: 'delegate' | 'consultation';
      consultationAgents?: string[];
      timeoutMs?: number;
    };

    if (!nc.runtime.subAgents.has(cfg.agentId)) {
      return { status: 'failed', error: `子智能体不存在: ${cfg.agentId}` };
    }

    try {
      const input = nc.ctx.applyMapping(cfg.inputMapping as Record<string, string>);
      const resp = await nc.runtime.subAgents.invoke({
        agentId: cfg.agentId,
        version: cfg.version,
        input,
        mode: cfg.mode,
        consultationAgents: cfg.consultationAgents,
        timeoutMs: cfg.timeoutMs,
      });
      return {
        status: 'completed',
        output: resp.output,
        selectedPort: 'out',
        tokens: resp.tokens,
      };
    } catch (e) {
      if (e instanceof WorkflowCancelledError) throw e;
      return { status: 'failed', error: `子智能体 ${cfg.agentId} 调用失败: ${(e as Error).message}` };
    }
  }
}
