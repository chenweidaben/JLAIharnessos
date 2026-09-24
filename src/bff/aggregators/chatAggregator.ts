/**
 * 健澜科技数智医院智能体 - BFF 对话聚合器（真实 LLM + 数据库持久化闭环）
 *
 * 一轮对话的完整闭环：
 *   1. 从 conversationRepo 读取最近 N 条历史作为多轮上下文；
 *   2. 用户消息落库（role='user'）；
 *   3. 流式调用 DeepSeek（OpenAI Chat Completions 兼容，stream:true）；
 *   4. 流式增量通过 onDelta 回调实时推送（REST SSE / WebSocket agent:delta）；
 *   5. 若模型请求工具调用：落库 assistant(tool_calls) -> 执行注册表工具 -> 落库 role='tool' ->
 *      再发起一次流式补答，产出最终自然语言回复；
 *   6. 助手回复落库（role='assistant'，含 toolCalls），刷新不丢。
 *
 * 说明：完整 MedicalAgentLoop 依赖 ToolExecutor / 风险管理器 / 安全审计上下文，
 * 本层先以「直连 DeepSeek 流式 + 单轮工具执行」的简化版打通闭环，
 * 后续可平滑替换为 MedicalAgentLoop.run() 事件订阅（事件契约一致）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  appendMessage,
  type ConversationMessage,
  getRecentMessages,
} from '@/db/repositories/conversationRepo';
import {
  createRegistryWithFirstBatch,
} from '@/medical-tools/registry';
import type {
  MedicalRole,
  MedicalToolContext,
  MedicalToolDefinition,
  MedicalUser,
  MedicalToolRegistry,
} from '@/medical-tools/types';

// ============================================================================
// 类型
// ============================================================================

/** 一轮对话中累计的一次工具调用 */
export interface AccumulatedToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** 落库的 assistant 消息上挂的工具调用记录 */
export interface StoredToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** 聚合结果 */
export interface ChatTurnResult {
  message: {
    id: string;
    role: 'assistant';
    content: string;
    createdAt: string;
    toolCalls: StoredToolCall[];
  };
  streamSessionId: string;
  toolCalls: StoredToolCall[];
  /** LLM 未配置 / 上游失败时的结构化错误（不使用写死回复兜底） */
  error?: { code: string; message: string };
}

/** runChatTurn 运行选项 */
export interface RunChatTurnOptions {
  userId?: string;
  userName?: string;
  /** 流式文本增量回调（REST SSE / WS agent:delta 共用） */
  onDelta?: (chunk: string) => void;
  /** 工具调用生命周期回调（供 WS 推送 agent:tool 事件） */
  onToolEvent?: (event: {
    stage: 'start' | 'end';
    callId: string;
    toolName: string;
    success: boolean;
    summary?: string;
  }) => void;
  signal?: AbortSignal;
}

// ============================================================================
// OpenAI Chat Completions 兼容报文（最小子集）
// ============================================================================

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface OpenAiToolCallDelta {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface OpenAiChunk {
  choices?: Array<{
    delta?: { content?: string | null; tool_calls?: OpenAiToolCallDelta[] };
    finish_reason?: string | null;
  }>;
}

interface PendingToolCall {
  id: string;
  name: string;
  args: string;
}

// ============================================================================
// 单例资源（惰性初始化，避免模块加载期副作用）
// ============================================================================

let registry: MedicalToolRegistry | null = null;

function getRegistry(): MedicalToolRegistry {
  if (!registry) registry = createRegistryWithFirstBatch();
  return registry;
}

const SYSTEM_PROMPT = [
  '你是健澜科技数智医院智能体，服务于医院医护人员的临床辅助工作。',
  '请结合患者病历、检验检查与医嘱上下文，给出严谨、合规、可操作的医疗辅助建议；',
  '不得替代医生的最终诊断与处方决策。使用简洁专业的中文回答，必要时分条说明。',
].join('');

const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ROUNDS = 1;
const MAX_TOOL_RESULT_CHARS = 2000;

// ============================================================================
// 历史消息 -> OpenAI messages
// ============================================================================

function historyToOpenAi(msgs: readonly ConversationMessage[]): OpenAiMessage[] {
  const out: OpenAiMessage[] = [];
  for (const m of msgs) {
    if (m.role === 'tool') {
      out.push({
        role: 'tool',
        tool_call_id: m.toolCallId ?? 'unknown',
        content: m.content ?? '',
      });
      continue;
    }
    if (m.role === 'system') continue;

    const stored = (m.toolCalls ?? []) as unknown as StoredToolCall[];
    if (m.role === 'assistant' && stored.length > 0) {
      out.push({
        role: 'assistant',
        content: m.content ?? '',
        tool_calls: stored.map((t) => ({
          id: t.id,
          type: 'function' as const,
          function: { name: t.name, arguments: JSON.stringify(t.args ?? {}) },
        })),
      });
    } else {
      out.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content ?? '' });
    }
  }
  return out;
}

// ============================================================================
// 工具定义 -> OpenAI function schema（best-effort，失败回退空对象）
// ============================================================================

function toolToOpenAi(t: MedicalToolDefinition): {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
} {
  let parameters: Record<string, unknown> = { type: 'object', properties: {} };
  try {
    const schema = t.inputSchema as unknown as { toJSONSchema?: () => unknown };
    if (typeof schema.toJSONSchema === 'function') {
      const js = schema.toJSONSchema();
      if (js && typeof js === 'object') {
        parameters = js as Record<string, unknown>;
      }
    }
  } catch {
    /* 回退到空对象 schema */
  }
  return {
    type: 'function',
    function: { name: t.name, description: t.description, parameters },
  };
}

// ============================================================================
// 医疗工具执行上下文（最小可用桩；真实安全组件后续接入审计/脱敏链路）
// ============================================================================

function buildToolContext(opts: RunChatTurnOptions, conversationId: string): MedicalToolContext {
  const medicalUser: MedicalUser = {
    userId: opts.userId ?? 'u_anonymous',
    name: opts.userName ?? '临床医生',
    role: 'doctor' as MedicalRole,
    department: '内科',
    permissions: [],
    loginTime: Date.now(),
    sessionId: conversationId,
    prescription权: false,
  };
  return {
    medicalUser,
    patientContext: {
      patientId: null,
      encounterId: null,
      department: '内科',
      visitType: 'outpatient',
      isEmergency: false,
    },
    security: {
      auditor: { log() {} },
      desensitizer: {
        desensitize<T>(data: T): T {
          return data;
        },
        maskIdCard: () => '',
        maskPhone: () => '',
        maskName: () => '',
      },
      permissionChecker: { hasPermission: () => true },
      emergencyOverride: false,
    },
    execution: {
      timeoutMs: 15_000,
      maxRetries: 0,
      traceId: conversationId,
      clientIp: '',
    },
    confirmation: {
      requestUserConfirm: async () => true,
      requestDoubleConfirm: async () => true,
    },
  };
}

// ============================================================================
// DeepSeek 单次流式调用
// ============================================================================

interface StreamOutcome {
  text: string;
  toolCalls: PendingToolCall[];
}

async function streamDeepSeek(
  messages: OpenAiMessage[],
  tools: ReturnType<typeof toolToOpenAi>[] | undefined,
  opts: RunChatTurnOptions,
): Promise<StreamOutcome> {
  const apiKey = process.env.LLM_API_KEY;
  const baseURL = (process.env.LLM_BASE_URL ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = process.env.LLM_MODEL ?? 'deepseek-chat';

  const controller = new AbortController();
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 60_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (timer.unref) timer.unref();
  const onExternalAbort = (): void => controller.abort();
  opts.signal?.addEventListener('abort', onExternalAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        ...(tools && tools.length > 0
          ? { tools, tool_choice: 'auto' }
          : {}),
        temperature: Number(process.env.LLM_TEMPERATURE) || 0.2,
        max_tokens: Number(process.env.LLM_MAX_TOKENS) || 8192,
        stream: true,
        stream_options: { include_usage: false },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`DeepSeek API 错误 ${response.status}: ${detail.slice(0, 300)}`);
  }

  let text = '';
  const pending = new Map<number, PendingToolCall>();

  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          let chunk: OpenAiChunk;
          try {
            chunk = JSON.parse(payload) as OpenAiChunk;
          } catch {
            continue;
          }
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          if (typeof delta.content === 'string' && delta.content.length > 0) {
            text += delta.content;
            opts.onDelta?.(delta.content);
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              let p = pending.get(tc.index);
              if (!p) {
                p = { id: tc.id ?? '', name: '', args: '' };
                pending.set(tc.index, p);
              }
              if (tc.id) p.id = tc.id;
              if (tc.function?.name) p.name = tc.function.name;
              if (tc.function?.arguments) p.args += tc.function.arguments;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  return { text, toolCalls: [...pending.values()].filter((p) => p.id && p.name) };
}

// ============================================================================
// 工具执行（best-effort，异常落库为 tool 结果）
// ============================================================================

async function executeAndPersistToolCall(
  conversationId: string,
  call: PendingToolCall,
  opts: RunChatTurnOptions,
): Promise<{ success: boolean; summary: string }> {
  const registry = getRegistry();
  const tool = registry.get(call.name);
  let args: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(call.args || '{}');
    if (typeof parsed === 'object' && parsed !== null) {
      args = parsed as Record<string, unknown>;
    }
  } catch {
    args = { raw: call.args };
  }

  opts.onToolEvent?.({ stage: 'start', callId: call.id, toolName: call.name, success: true });

  let summary: string;
  let success = false;
  if (!tool) {
    summary = `[未注册工具] ${call.name}`;
  } else {
    try {
      const result = await tool.execute(args, buildToolContext(opts, conversationId));
      success = result.success;
      summary = result.success
        ? safeStringify(result.data)
        : `[工具错误] ${result.error?.message ?? '执行失败'}`;
    } catch (e) {
      summary = `[工具异常] ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  if (summary.length > MAX_TOOL_RESULT_CHARS) {
    summary = summary.slice(0, MAX_TOOL_RESULT_CHARS) + '…[截断]';
  }

  await appendMessage(conversationId, {
    role: 'tool',
    content: summary,
    toolCallId: call.id,
    toolName: call.name,
  });

  opts.onToolEvent?.({ stage: 'end', callId: call.id, toolName: call.name, success, summary });
  return { success, summary };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// ============================================================================
// 主入口：一轮对话
// ============================================================================

/**
 * 执行一轮对话：落库用户消息 -> 流式调 LLM（可含单轮工具调用）-> 落库助手消息。
 *
 * 无 LLM_API_KEY 时返回结构化错误（不使用任何写死回复）。
 */
export async function runChatTurn(
  conversationId: string,
  userContent: string,
  opts: RunChatTurnOptions = {},
): Promise<ChatTurnResult> {
  const streamSessionId = `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // 0) LLM 配置校验
  if (!process.env.LLM_API_KEY) {
    return {
      message: {
        id: '',
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        toolCalls: [],
      },
      streamSessionId,
      toolCalls: [],
      error: {
        code: 'LLM_NOT_CONFIGURED',
        message: '未配置大模型 API Key，请在 .env 中设置 LLM_API_KEY',
      },
    };
  }

  const content = userContent.trim();
  if (!content) {
    return {
      message: {
        id: '',
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        toolCalls: [],
      },
      streamSessionId,
      toolCalls: [],
      error: { code: 'BAD_REQUEST', message: '消息内容不能为空' },
    };
  }

  try {
    // 1) 读历史（在落库新用户消息之前读，避免自我重复）
    const history = await getRecentMessages(conversationId, MAX_HISTORY_MESSAGES);
    const baseMessages: OpenAiMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historyToOpenAi(history),
    ];

    // 2) 用户消息落库
    await appendMessage(conversationId, { role: 'user', content });

    // 3) 组装工具定义（第一批注册工具，best-effort schema）
    const tools = getRegistry()
      .getAll()
      .map(toolToOpenAi);

    // 4) 首轮流式调用
    const first = await streamDeepSeek([...baseMessages, { role: 'user', content }], tools, opts);

    // 5) 无工具调用：直接产出最终回复
    if (first.toolCalls.length === 0) {
      const saved = await appendMessage(conversationId, {
        role: 'assistant',
        content: first.text,
        toolCalls: [],
      });
      return {
        message: toResultMessage(saved),
        streamSessionId,
        toolCalls: [],
      };
    }

    // 6) 有工具调用：assistant(tool_calls) 落库 -> 执行工具 -> role='tool' 落库 -> 补答
    const storedCalls: StoredToolCall[] = first.toolCalls.map((p) => ({
      id: p.id,
      name: p.name,
      args: safeParseArgs(p.args),
    }));

    // 6.1 assistant 消息（含工具调用块；文本先落，后续补答的最终文本另起一条 assistant 消息）
    const assistantMsg = await appendMessage(conversationId, {
      role: 'assistant',
      content: first.text || null,
      toolCalls: storedCalls as unknown as Array<Record<string, unknown>>,
    });

    // 6.2 组装回传给模型的 assistant + tool 消息
    const followMessages: OpenAiMessage[] = [
      ...baseMessages,
      { role: 'user', content },
      {
        role: 'assistant',
        content: first.text || null,
        tool_calls: storedCalls.map((c) => ({
          id: c.id,
          type: 'function' as const,
          function: { name: c.name, arguments: JSON.stringify(c.args) },
        })),
      },
    ];

    // 6.3 执行工具并落库 role='tool'（最多一轮工具循环）
    for (const call of first.toolCalls) {
      const { summary } = await executeAndPersistToolCall(conversationId, call, opts);
      followMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: summary,
      });
    }

    // 6.4 第二轮流式补答（不再暴露工具，强制自然语言收尾）
    let finalText = '';
    if (MAX_TOOL_ROUNDS >= 1) {
      const second = await streamDeepSeek(followMessages, undefined, opts);
      finalText = second.text;
    }
    if (!finalText.trim()) {
      finalText = first.text || '已完成工具调用，但未产出最终结论。';
    }

    const finalMsg = await appendMessage(conversationId, {
      role: 'assistant',
      content: finalText,
      toolCalls: [],
      tokensOut: 0,
    });

    return {
      message: toResultMessage(finalMsg),
      streamSessionId,
      toolCalls: storedCalls,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // 失败也落库一条错误消息，便于追溯
    await appendMessage(conversationId, {
      role: 'assistant',
      content: null,
      error: `LLM 调用失败: ${message}`,
    }).catch(() => undefined);
    return {
      message: {
        id: '',
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        toolCalls: [],
      },
      streamSessionId,
      toolCalls: [],
      error: { code: 'LLM_CALL_FAILED', message },
    };
  }
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function toResultMessage(msg: ConversationMessage): ChatTurnResult['message'] {
  const toolCalls = (msg.toolCalls ?? []) as unknown as StoredToolCall[];
  return {
    id: msg.id,
    role: 'assistant',
    content: msg.content ?? '',
    createdAt: msg.createdAt,
    toolCalls: toolCalls.map((t) => ({ id: t.id, name: t.name, args: t.args ?? {} })),
  };
}
