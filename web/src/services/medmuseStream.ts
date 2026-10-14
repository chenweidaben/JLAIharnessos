/**
 * MEDMUSE 前端流式消费封装（SSE / ReadableStream）。
 *
 * 为什么用 fetch 而不是 EventSource：
 *   - EventSource 只支持 GET，无法携带 POST body 与 Authorization /
 *     X-CSRF-Token 头；本项目鉴权为 Bearer Token + CSRF 双重提交，故用
 *     fetch + ReadableStream 手动解析 SSE 帧。
 *
 * 服务端帧约定（见 src/bff/routes/medmuseStream.ts）：
 *   data: {"type":"delta","text":"..."}   // 增量文本（打字机）
 *   data: {"type":"meta","confidence":"...","disclaimer":"..."}  // 收尾元信息
 *   data: [DONE]                          // 结束帧
 *
 * 安全：
 *   - 不携带 Idempotency-Key（避免后端 withIdempotency 缓冲整段响应）；
 *   - 同源请求自动带 cookie，这里回传 X-CSRF-Token 通过双重提交校验。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { tokenStorage } from '@/utils/auth';
import { getCsrfToken } from '@/utils/cookie';
import { env } from '@/utils/config';

/** 流式收尾元信息（与后端 meta 帧对齐） */
export interface MedmuseStreamMeta {
  confidence?: 'high' | 'medium' | 'low';
  disclaimer?: string;
}

/** 流式事件回调 */
export interface MedmuseStreamHandlers {
  /** 每收到一段增量文本（追加渲染，形成打字机效果） */
  onDelta: (text: string) => void;
  /** 收尾元信息（confidence / disclaimer），可选 */
  onMeta?: (meta: MedmuseStreamMeta) => void;
  /** 正常结束（收到 [DONE] 或流自然关闭） */
  onDone?: () => void;
  /** 网络/协议错误（由调用方决定是否回退到一次性发送） */
  onError?: (err: Error) => void;
}

interface StreamFrame {
  type?: 'delta' | 'meta' | string;
  text?: string;
  confidence?: 'high' | 'medium' | 'low';
  disclaimer?: string;
}

/**
 * 发起一次流式对话。
 *
 * @param sessionId 会话 id（DEMO 下仅回显，不做归属校验）
 * @param content   用户消息文本
 * @param handlers  流式回调
 * @param signal    可选 AbortSignal，用于中途取消
 */
export async function streamMedmuseReply(
  sessionId: string,
  content: string,
  handlers: MedmuseStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${env.apiBaseUrl}/medmuse/stream`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${tokenStorage.getAccessToken()}`,
        // 同源写请求：CSRF 双重提交
        ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}),
      },
      body: JSON.stringify({ sessionId, content }),
      signal,
    });
  } catch (e) {
    throw e instanceof Error ? e : new Error('流式请求失败');
  }

  if (!resp.ok || !resp.body) {
    // 尝试读出后端统一错误信封里的 message，便于排障
    let msg = `流式接口异常（HTTP ${resp.status}）`;
    try {
      const j = (await resp.json()) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      /* 非 JSON 错误体，忽略 */
    }
    throw new Error(msg);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 以空行（\n\n）分隔帧；逐帧取出，尾部不完整片段留到下一轮
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawFrame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        handleFrame(rawFrame, handlers);
      }
    }
    // 收尾解码残留
    const tail = decoder.decode();
    if (tail) handleFrame(tail, handlers);
  } catch (e) {
    // 主动取消（关页面/AbortController）视为正常结束，不再向上抛
    if (!signal?.aborted) throw e;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* 已释放 */
    }
  }

  handlers.onDone?.();
}

/** 解析单帧 SSE 文本（可能含多行 data:），分发到回调 */
function handleFrame(rawFrame: string, handlers: MedmuseStreamHandlers): void {
  // 收集本帧所有 data: 行（SSE 规范允许多行 data 拼接）
  const dataLines = rawFrame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''));
  if (dataLines.length === 0) return;

  const dataStr = dataLines.join('\n');
  if (dataStr === '[DONE]') {
    handlers.onDone?.();
    return;
  }

  let frame: StreamFrame;
  try {
    frame = JSON.parse(dataStr) as StreamFrame;
  } catch {
    return;
  }

  if (frame.type === 'delta' && typeof frame.text === 'string') {
    handlers.onDelta(frame.text);
  } else if (frame.type === 'meta') {
    handlers.onMeta?.({ confidence: frame.confidence, disclaimer: frame.disclaimer });
  }
}
