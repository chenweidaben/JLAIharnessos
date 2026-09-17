/**
 * 健澜科技数智医院智能体 - BFF 请求日志中间件
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { Ctx } from '../types';

/** 极简请求日志：方法、路径、耗时、状态 */
export function logRequest(c: Ctx, status: number, startedAt: number): void {
  const ms = Date.now() - startedAt;
  // 生产环境应替换为结构化日志（接入 Logger）
  // eslint-disable-next-line no-console
  console.log(`${c.req.method} ${c.req.url} ${status} ${ms}ms [${c.traceId}]`);
}
