/**
 * 健澜科技 jlmedaios - 门诊 AI 会话服务（真实 SSE 流式）
 *
 * - createAiConversation：创建绑定真实医生 + 患者/就诊的会话
 * - getAiMessages：拉取已持久化的历史消息（刷新不丢）
 * - streamAiMessage：以 SSE 发起一轮对话，流式渲染 delta，并透明展示工具调用过程
 *
 * 真实模式直连 BFF；任何上游错误经 onError 明确上报，绝不本地编造回复。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import { tokenStorage } from '@/utils/auth';
import { getCsrfToken } from '@/utils/cookie';
import { env } from '@/utils/config';

/** 会话消息视图（对齐后端 ConversationMessage） */
export interface AiMessageView {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  toolCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }>;
  toolName?: string | null;
  error?: string | null;
  createdAt: string;
}

/** 创建会话入参 */
export interface CreateAiConversationInput {
  title: string;
  patientId?: string;
  encounterId?: string;
}

/** 会话视图（仅取前端需要字段） */
export interface AiConversationView {
  id: string;
  title: string;
  patientId: string | null;
  metadata: Record<string, unknown>;
}

/** SSE 工具事件 */
export interface StreamToolEvent {
  stage: 'start' | 'end';
  callId: string;
  toolName: string;
  success: boolean;
  summary?: string;
}

/** SSE 完成事件 */
export interface StreamDonePayload {
  message: {
    id: string;
    role: 'assistant';
    content: string;
    createdAt: string;
  };
  toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
}

export interface StreamHandlers {
  onDelta: (text: string) => void;
  onTool: (event: StreamToolEvent) => void;
  onDone: (payload: StreamDonePayload) => void;
  onError: (code: string, message: string) => void;
}

/** 创建绑定患者/就诊的会话 */
export async function createAiConversation(
  input: CreateAiConversationInput,
): Promise<AiConversationView> {
  const conv = await post<AiConversationView>('/chat/conversations', {
    title: input.title,
    patientId: input.patientId,
    encounterId: input.encounterId,
  });
  return conv;
}

/** 拉取会话历史消息 */
export async function getAiMessages(conversationId: string): Promise<AiMessageView[]> {
  return get<AiMessageView[]>(`/chat/conversations/${conversationId}/messages`);
}

/**
 * 以 SSE 发起一轮对话。
 * 采用原生 fetch + ReadableStream 解析 text/event-stream；axios 不适合长连接增量。
 */
export async function streamAiMessage(
  conversationId: string,
  content: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const base = env.apiBaseUrl;
  const token = tokenStorage.getAccessToken();
  const csrfToken = getCsrfToken();
  let response: Response;
  try {
    response = await fetch(`${base}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify({ content }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    handlers.onError('NETWORK', e instanceof Error ? e.message : '网络异常，无法连接 BFF');
    return;
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    handlers.onError(
      'HTTP_ERROR',
      `BFF 返回 ${response.status}：${detail.slice(0, 200) || '请确认 BFF 已启动且已登录'}`,
    );
    return;
1 }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleEvent = (rawEvent: string): void => {
    // 一个事件可能含多行，取以 data: 开头的行拼接
    const dataLines = rawEvent
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim());
    if (dataLines.length === 0) return;
    const data = dataLines.join('');
    if (data === '[DONE]') return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = String(payload.type ?? '');
    if (type === 'delta' && typeof payload.text === 'string') {
      handlers.onDelta(payload.text);
    } else if (type === 'tool') {
      handlers.onTool({
        stage: payload.stage === 'end' ? 'end' : 'start',
        callId: String(payload.callId ?? ''),
        toolName: String(payload.toolName ?? ''),
        success: payload.success !== false,
        summary: typeof payload.summary === 'string' ? payload.summary : undefined,
      });
    } else if (type === 'done') {
      handlers.onDone(payload as unknown as StreamDonePayload);
    } else if (type === 'error') {
      handlers.onError(
        String(payload.code ?? 'ERROR'),
        String(payload.message ?? 'AI 服务异常'),
      );
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      // SSE 事件以空行（\n\n）分隔
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        handleEvent(rawEvent);
      }
    }
    if (buffer.trim()) handleEvent(buffer);
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    handlers.onError('STREAM', e instanceof Error ? e.message : '流式读取中断');
  } finally {
    reader.releaseLock();
  }
}
