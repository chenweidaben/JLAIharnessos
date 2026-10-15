/**
 * 健澜科技数智医院智能体 - BFF 请求日志中间件
 *
 * 生产环境（NODE_ENV=production）输出结构化 JSON 日志，字段：
 *   timestamp / level / message / durationMs（另附 method、status、traceId 便于检索）；
 * 非生产环境保留易读的单行文本格式，便于本地调试。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { Ctx } from '../types';

/** 生产环境结构化日志记录形状 */
interface JsonLogRecord {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  durationMs: number;
  method: string;
  status: number;
  traceId: string;
}

/**
 * 记录一次请求的耗时与结果。
 *
 * @param c 请求上下文（取 method、url、traceId）
 * @param status 响应状态码
 * @param startedAt 请求开始时间戳（Date.now()）
 */
export function logRequest(c: Ctx, status: number, startedAt: number): void {
  const ms = Date.now() - startedAt;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const record: JsonLogRecord = {
      timestamp: new Date().toISOString(),
      level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      message: `${c.req.method} ${c.req.url} ${status}`,
      durationMs: ms,
      method: c.req.method,
      status,
      traceId: c.traceId,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(record));
    return;
  }

  // 开发环境：易读单行日志
  // eslint-disable-next-line no-console
  console.log(`${c.req.method} ${c.req.url} ${status} ${ms}ms [${c.traceId}]`);
}
