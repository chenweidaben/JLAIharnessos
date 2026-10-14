/**
 * MEDMUSE BFF 流式路由 - SSE 打字机输出（DEMO 演示）。
 *
 * 端点：POST /api/v1/medmuse/stream（auth 登录即可，不校验权限码）
 *
 * 设计说明：
 *   - 返回 Content-Type: text/event-stream，按 SSE 规范逐行下发
 *     `data: {json}\n\n`；
 *   - DEMO 模式：把一段演示回复按 ~10 字切块，每 100ms 推送一个
 *     `{"type":"delta","text":"..."}` 片段，模拟模型流式吐字；
 *   - 片段发完后下发一条 `{"type":"meta",...}`（confidence/disclaimer），
 *     最后下发 `data: [DONE]` 结束帧；
 *   - 医疗安全：演示文本固定附带免责声明，不执行任何写操作/工具。
 *
 * 透传约束（重要）：
 *   - 全局 withIdempotency 仅在请求携带 Idempotency-Key 时才会缓冲并重序列化
 *     响应体；本路由前端消费方刻意不带该头，流即可原样透传，不被收干；
 *   - 前端同源 fetch 会携带 csrf-token cookie，须回传 X-CSRF-Token 头通过
 *     全局 CSRF 双重提交校验。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, type RouteDef } from '../types';

/** SSE 响应头：禁止中间层/网关缓冲，保证逐帧到达 */
const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

/** 每帧间隔（毫秒）：DEMO 打字机节奏 */
const TICK_MS = 100;

/** 单帧字符块大小：越小越像逐字输出 */
const CHUNK_SIZE = 10;

/** 演示回复的免责声明（与 TemplateFallbackProvider 口径一致） */
const DEMO_DISCLAIMER = 'AI 辅助建议，最终决策以执业医师/药师为准';

/** 把回复正文切成小块，尽量在标点/换行处断句，打字机更自然 */
function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    // 若块内含换行，优先切到换行处，避免把一段挤在一帧
    const nl = text.indexOf('\n', i);
    if (nl !== -1 && nl < end) end = nl + 1;
    out.push(text.slice(i, end));
    i = end;
  }
  return out;
}

/** 根据用户提问拼一段演示回复（DEMO：不连模型/不落库） */
function buildDemoReply(content: string, userName: string): string {
  const head = content.length > 40 ? `${content.slice(0, 40)}…` : content;
  return [
    `收到您的提问：「${head}」。`,
    '',
    `【健澜科技 MEDMUSE 演示流式回复】当前在线岗位身份：${userName}。`,
    '下面给出一个结构化的初步分析框架，用于展示 SSE 逐帧打字效果：',
    '1. 临床要点梳理：结合主诉、现病史与近期检验检查结果综合判断；',
    '2. 风险筛查：关注生命体征与危急值，异常时触发上级医师/药师复核；',
    '3. 建议下一步：完善必要检查后再行决策，写操作将进入审批流程。',
    '',
    '本回复为演示数据，仅用于验证流式交互效果，不构成真实诊疗建议。',
  ].join('\n');
}

export const medmuseStreamRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/medmuse/stream',
    auth: true,
    handle: async (c) => {
      // auth:true 已在路由层 requireAuth 过；这里再兜底一次未登录
      if (!c.user) {
        return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
      }
      let body: { content?: string };
      try {
        body = await c.body<{ content?: string }>();
      } catch {
        body = {};
      }
      const content = (body?.content ?? '').trim();
      if (!content) {
        return json(fail(ErrorCode.BAD_REQUEST, 'content 不能为空', c.traceId), 400);
      }

      const replyText = buildDemoReply(content, c.user.name || '当前用户');
      const chunks = chunkText(replyText);
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
                  confidence: 'medium',
                  disclaimer: DEMO_DISCLAIMER,
                })}\n\n`,
              );
              enqueue('data: [DONE]\n\n');
              closed = true;
              controller.close();
            }
          };
          timer = setTimeout(flush, TICK_MS);

          // 客户端断开（关页面/取消）：停表并关闭流，避免悬空定时器
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
