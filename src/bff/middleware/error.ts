/**
 * 健澜科技数智医院智能体 - BFF 错误处理中间件
 *
 * 安全要点（等保三级）：
 *  - 5xx 不向客户端返回堆栈 / SQL / 文件路径等内部细节
 *  - 原始错误仅服务端 console 记录，客户端统一返回通用文案 + traceId
 *  - 业务侧主动 throw 的带 ApiResponse 错误可透传（如需）
 *
 * v5.0试点扩展（M185bug修复）：
 *  - DEMO_MODE=1 下，"relation ... does not exist" / 表未迁移类错误也降级为空数组，
 *    避免前端把 500 误判为 BFF/DB 不可用（演示库不跑全量迁移属预期）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type ApiResponse, type Ctx, ErrorCode, fail, type Handler, json, ok } from '../types';

/** 包裹 handler，捕获未处理异常并转为统一错误响应（不泄露内部细节） */
export function withErrorHandler(handler: Handler): Handler {
  return async (c: Ctx) => {
    try {
      return await handler(c);
    } catch (e) {
      const demoMode = process.env.DEMO_MODE === '1';
      const msg = e instanceof Error ? e.message : String(e);
      const isDbConnError =
        msg.includes('Failed to connect') ||
        msg.includes('connect ECONNREFUSED') ||
        msg.includes('connect_timeout') ||
        msg.includes('postgres') ||
        msg.includes('getaddrinfo') ||
        (e instanceof Error && e.stack?.includes('postgres'));
      // v5.0试点扩展（M185bug修复）：演示库未建表/未迁移时的 relation 缺失，按空数据降级
      const isDbSchemaMissing =
        msg.includes('does not exist') ||
        msg.includes('relation') ||
        msg.includes('schema') ||
        msg.includes('table') ||
        msg.includes('column') ||
        msg.includes('permission denied for schema');

      // DEMO_MODE 下：DB 未连接 / 表未迁移是预期行为，降级返回空数组而非 500
      if (demoMode && (isDbConnError || isDbSchemaMissing)) {
        console.warn(`[demo-fallback] ${c.req.method} ${c.req.url} DB unavailable in demo mode, returning empty array`);
        return json(ok([]));
      }

      // 服务端完整日志（含堆栈）
      console.error(`[bff error] ${c.req.method} ${c.req.url} [${c.traceId}]`, e);
      // 客户端：通用文案 + traceId，不泄露内部信息
      return json(
        fail<ApiResponse>(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
        500,
      );
    }
  };
}
