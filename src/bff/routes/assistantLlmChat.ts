/**
 * 健澜科技 jlmedaios - 真实 LLM 对话路由（M131-C，AI能力深化）。
 *
 * POST /api/v1/assistant/llm/chat
 *   body: {
 *     message: string;                          // 本轮提问
 *     history?: Array<{ role: 'user'|'assistant'; content: string }>;  // 多轮历史
 *     provider?: 'openai' | 'qwen' | 'ollama';  // 后端切换（缺省读服务端配置）
 *     patientSummary?: string; deptCode?: string; staffRole?: string;  // 院内脱敏上下文
 *   }
 *
 * 流式输出（SSE）：
 *   data: {"type":"delta","text":"..."}   // 增量文本（打字机）
 *   data: {"type":"meta","degraded":bool,"model":"...","provider":"...","disclaimer":"..."}
 *   data: [DONE]
 *
 * 生产级约束（AI能力深化）：
 *  - callRealLLM 内部带超时 + 指数退避重试 + fail-open 降级，本路由永不挂起；
 *  - 上游降级时同样把兜底文案逐帧流出，前端交互体验一致；
 *  - 仅登录鉴权（auth:true），不新增权限码、不碰 WebSocket、不落库。
 *
 * 医疗安全：输出统一携带免责声明，AI 辅助不替代执业医师判断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, type RouteDef } from '../types';
import {
  callRealLLM,
  MEDICAL_DISCLAIMER,
  type LLMClientMessage,
} from '../aggregators/llmClientAggregator.js';

/** SSE 响应头：禁止中间层/网关缓冲，保证逐帧到达 */
const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

/** 每帧间隔（毫秒）：打字机节奏 */
const TICK_MS = 40;
/** 单帧字符块大小 */
const CHUNK_SIZE = 8;

/** 请求体 */
interface AssistantLlmChatBody {
  message?: string;
  history?: Array<{ role?: string; content?: string }>;
  provider?: string;
  patientSummary?: string;
  deptCode?: string;
  staffRole?: string;
}

/** 把回复正文切成小块，优先在换行处断开，打字机更自然 */
function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    const nl = text.indexOf('\n', i);
    if (nl !== -1 && nl < end) end = nl + 1;
    out.push(text.slice(i, end));
    i = end;
  }
  return out;
}

/** 规整前端上传的历史消息：只保留合法 role/content，且剔除 system（系统提示由后端重建） */
function normalizeHistory(raw: AssistantLlmChatBody['history']): LLMClientMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: LLMClientMessage[] = [];
  for (const h of raw) {
    if (!h || typeof h.content !== 'string' || !h.content.trim()) continue;
    if (h.role === 'user' || h.role === 'assistant') out.push({ role: h.role, content: h.content });
  }
  return out;
}

export const assistantLlmChatRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/assistant/llm/chat',
    auth: true,
    handle: async (c) => {
      if (!c.user) {
        return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
      }

      let body: AssistantLlmChatBody;
      try {
        body = await c.body<AssistantLlmChatBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }

      const message = (body?.message ?? '').trim();
      if (!message) {
        return json(fail(ErrorCode.BAD_REQUEST, 'message 不能为空', c.traceId), 400);
      }

      // AI能力深化：真实 LLM 调用（超时/重试/降级均在聚合器内闭环，这里不会卡住）
      const reply = await callRealLLM(message, {
        patientSummary: body?.patientSummary,
        deptCode: body?.deptCode,
        staffRole: body?.staffRole,
      }, {
        provider: body?.provider,
        history: normalizeHistory(body?.history),
        onWarning: (m) => {
          // eslint-disable-next-line no-console
          console.warn(`[assistantLlmChat] ${m}`);
        },
      });

      const chunks = chunkText(reply.content);
      const encoder = new TextEncoder();
      let idx = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let closed = false;

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const enqueue = (line: string) => {
            if (!closed) controller.enqueue(encoder.encode(line));
          };
          const flush = () => {
            if (closed) return;
            if (idx < chunks.length) {
              enqueue(`data: ${JSON.stringify({ type: 'delta', text: chunks[idx] })}\n\n`);
              idx += 1;
              timer = setTimeout(flush, TICK_MS);
            } else {
              // 收尾：元信息帧 + 结束帧
              enqueue(
                `data: ${JSON.stringify({
                  type: 'meta',
                  degraded: reply.degraded,
                  model: reply.model,
                  provider: reply.provider,
                  disclaimer: MEDICAL_DISCLAIMER,
                })}\n\n`,
              );
              enqueue('data: [DONE]\n\n');
              closed = true;
              controller.close();
            }
          };
          timer = setTimeout(flush, TICK_MS);

          // 客户端断开：停表并关闭流，避免悬空定时器
          c.req.signal?.addEventListener('abort', () => {
            if (closed) return;
            closed = true;
            if (timer) clearTimeout(timer);
            try {
              controller.close();
            } catch {
              /* 已关闭 */
            }
          });
        },
        cancel() {
          closed = true;
          if (timer) clearTimeout(timer);
        },
      });

      return new Response(stream, { status: 200, headers: SSE_HEADERS });
    },
  },
];
