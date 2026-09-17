/**
 * 健澜科技数智医院智能体 - BFF 错误处理中间件
 *
 * 安全要点（等保三级）：
 *  - 5xx 不向客户端返回堆栈 / SQL / 文件路径等内部细节
 *  - 原始错误仅服务端 console 记录，客户端统一返回通用文案 + traceId
 *  - 业务侧主动 throw 的带 ApiResponse 错误可透传（如需）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type ApiResponse, type Ctx, ErrorCode, fail, type Handler, json } from '../types';

/** 包裹 handler，捕获未处理异常并转为统一错误响应（不泄露内部细节） */
export function withErrorHandler(handler: Handler): Handler {
  return async (c: Ctx) => {
    try {
      return await handler(c);
    } catch (e) {
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
