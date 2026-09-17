/**
 * 健澜科技杠OS - BFF 可观测性指标入口
 *
 * 指标原语（Counter/Gauge/Histogram/Registry）与业务指标（智能体/工具/CDS/人工任务）
 * 定义在核心层 src/core/observability/metrics.ts，供编排内核与工具运行时埋点；
 * 本模块在同一进程级注册中心补充 HTTP/WebSocket/进程指标，并由 GET /metrics 统一渲染。
 *
 * 不引入 prom-client 等第三方依赖，直接输出 Prometheus exposition format
 * （text/plain; version=0.0.4）。指标名统一 gangos_ 前缀。
 *
 * 标签基数控制：route 使用路由模板（如 /api/v1/patient/:id）而非真实路径，
 * 严禁把 patientId、traceId、自由文本作为标签值，避免时序爆炸。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import {
  businessMetrics,
  Counter,
  Gauge,
  Histogram,
  registry,
} from '@/core/observability/metrics.js';

// 核心原语与业务埋点函数对 BFF 侧透传，保持单一实现来源
export {
  type AgentRunStatus,
  businessMetrics,
  Counter,
  Gauge,
  Histogram,
  type HumanTaskOutcome,
  type Labels,
  MetricsRegistry,
  recordAgentRun,
  recordCdsAlert,
  recordHumanTask,
  recordToolCall,
  registry,
  type ToolCallResult,
} from '@/core/observability/metrics.js';

/** BFF 进程与 HTTP/WS 指标（注册到共享 registry） */
export const bffMetrics = {
  up: registry.register(new Gauge('gangos_up', 'BFF 进程是否存活（1=存活）')),
  httpRequests: registry.register(
    new Counter('gangos_http_requests_total', 'HTTP 请求总数', ['method', 'route', 'code']),
  ),
  httpDuration: registry.register(
    new Histogram(
      'gangos_http_request_duration_seconds',
      'HTTP 请求处理时延（秒）',
      ['method', 'route'],
    ),
  ),
  wsConnections: registry.register(new Gauge('gangos_ws_connections', '当前 WebSocket 连接数')),
};

/** 聚合全部指标（业务 + BFF），便于按名访问 */
export const metrics = { ...businessMetrics, ...bffMetrics };

/** 记录一次 HTTP 请求（在响应返回时调用） */
export function recordHttpRequest(opts: {
  method: string;
  route: string;
  code: number;
  durationSeconds: number;
}): void {
  const common = { method: opts.method, route: opts.route };
  bffMetrics.httpRequests.inc({ ...common, code: String(opts.code) });
  bffMetrics.httpDuration.observe(common, opts.durationSeconds);
}

/** 渲染 Prometheus 文本格式 */
export function renderMetrics(): string {
  bffMetrics.up.set({}, 1);
  return registry.render();
}
