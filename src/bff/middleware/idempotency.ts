/**
 * 健澜科技数智医院智能体 - 统一幂等键中间件（M7-A）
 *
 * 客户端对写请求携带 `Idempotency-Key` 头（推荐 UUID）。本中间件在路由
 * 命中、鉴权通过后包装 handler 执行：
 *
 *  - 无 Idempotency-Key：直接执行，不改变现有行为；
 *  - 首次出现：落 processing 占位 → 执行 handler → 缓存响应状态与响应体；
 *  - 重复且已完成：安全重放首次响应（附 Idempotent-Replay 头）；
 *  - 重复且处理中：返回 409，提示勿并发重试；
 *  - 同键但请求指纹（方法/路径/请求体）不一致：返回 409，拒绝复用。
 *
 * handler 抛错时删除 processing 占位，使客户端可用同一键安全重试。
 * 幂等键按用户隔离；未登录请求以客户端 IP 作为匿名作用域。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  beginProcessing,
  completeProcessing,
  discardProcessing,
} from '../../db/repositories/idempotencyRepo';
import { type Ctx, ErrorCode, fail, json } from '../types';

/** 计算请求指纹：对「方法 + 路径 + 原始请求体」做 SHA-256（十六进制）。 */
export async function computeRequestHash(
  method: string,
  path: string,
  rawBody: string | null,
): Promise<string> {
  const payload = `${method}\n${path}\n${rawBody ?? ''}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function clientIp(ctx: Ctx): string {
  return (
    ctx.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  );
}

/** 构造 JSON 响应（重放与错误均复用统一信封/内容类型）。 */
function jsonResponse(status: number, body: unknown, replay = false): Response {
  const init: ResponseInit = {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  };
  if (replay) (init.headers as Record<string, string>)['Idempotent-Replay'] = 'true';
  return new Response(JSON.stringify(body), init);
}

/**
 * 用幂等键包装 handler。
 * @param runHandler 实际业务处理（返回 Response）
 */
export async function withIdempotency(
  ctx: Ctx,
  runHandler: () => Response | Promise<Response>,
): Promise<Response> {
  const key = ctx.req.headers.get('idempotency-key')?.trim();
  if (!key) return runHandler();

  if (key.length < 8 || key.length > 200) {
    return json(
      fail(ErrorCode.BAD_REQUEST, 'Idempotency-Key 长度需在 8–200 字符之间（推荐 UUID）', ctx.traceId),
      400,
    );
  }

  const url = new URL(ctx.req.url);
  const path = url.pathname;
  const method = ctx.req.method.toUpperCase();
  const userId = ctx.user?.id ?? `anon:${clientIp(ctx)}`;
  const requestHash = await computeRequestHash(method, path, ctx.rawBody);

  const begin = await beginProcessing({
    idempotencyKey: key,
    userId,
    method,
    requestPath: path,
    requestHash,
  });

  if (begin.outcome === 'started') {
    try {
      const res = await runHandler();
      const text = await res.text();
      let bodyJson: unknown = text;
      try {
        bodyJson = JSON.parse(text);
      } catch {
        // 非 JSON 响应：原样保存文本
      }
      await completeProcessing({
        idempotencyKey: key,
        userId,
        responseStatus: res.status,
        responseBody: bodyJson,
      });
      return jsonResponse(res.status, bodyJson);
    } catch (err) {
      // 清理占位失败（如 DB 同时不可用）不应掩盖原始错误
      try {
        await discardProcessing({ idempotencyKey: key, userId });
      } catch {
        // 忽略清理错误，保留原始 err
      }
      throw err;
    }
  }

  const rec = begin.record;
  // 同键被不同请求复用：拒绝（防止覆盖首次结果）
  if (rec.method !== method || rec.requestPath !== path || rec.requestHash !== requestHash) {
    return json(
      fail(
        ErrorCode.CONFLICT,
        '该 Idempotency-Key 已用于不同请求，请勿复用幂等键',
        ctx.traceId,
      ),
      409,
    );
  }

  if (rec.status === 'processing') {
    return json(
      fail(
        ErrorCode.CONFLICT,
        '相同请求正在处理中，请勿并发重复提交；如已超时可稍后重试',
        ctx.traceId,
      ),
      409,
    );
  }

  // 已完成：安全重放首次响应
  return jsonResponse(rec.responseStatus ?? 200, rec.responseBody, true);
}
