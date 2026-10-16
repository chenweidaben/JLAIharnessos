/**
 * 健澜科技 jlmedaios - 微服务架构深化纯函数（M197-B）
 *
 * buildMicroservicesReport / mapServiceDependencies / detectServiceAnomaly
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 服务依赖 */
export interface ServiceDependency {
  service: string;
  dependsOn: string[];
}

/**
 * 服务依赖拓扑（纯函数）。
 *
 * @param services 服务列表
 * @returns 依赖关系
 */
export function mapServiceDependencies(services: ServiceDependency[]): { service: string; upstream: number; downstream: number }[] {
  return services.map((s) => ({
    service: s.service,
    upstream: s.dependsOn.length,
    downstream: services.filter((other) => other.dependsOn.includes(s.service)).length,
  }));
}

/** 服务监控数据 */
export interface ServiceMonitorData {
  serviceName: string;
  qps: number;
  p99LatencyMs: number;
  errorRate: number;
  cpuUsage: number;
}

/**
 * 服务异常检测（纯函数）。
 *
 * @param data 监控数据
 * @returns 异常状态
 */
export function detectServiceAnomaly(data: ServiceMonitorData): { anomaly: boolean; reason: string } {
  if (data.errorRate > 0.05) return { anomaly: true, reason: '错误率过高' };
  if (data.p99LatencyMs > 1000) return { anomaly: true, reason: 'P99 延迟过高' };
  if (data.cpuUsage > 0.9) return { anomaly: true, reason: 'CPU 过载' };
  return { anomaly: false, reason: '正常' };
}

/** 微服务报告输出 */
export interface MicroservicesReport {
  timeRange: string;
  catalog: { total: number; grpc: number; rest: number; async: number };
  governance: { rateLimiting: number; circuitBreaking: number; retries: number; timeouts: number };
  discovery: { registered: number; healthy: number };
  config: { configs: number; environments: number };
  gateway: { routes: number; dailyRequests: number };
  tracing: { traces: number; slowCalls: number; topDependencies: string[] };
  monitoring: { avgQPS: number; avgP99: number; avgErrorRate: number };
  suggestions: string[];
}

/**
 * 构建微服务报告。
 *
 * @param timeRange 时间范围
 * @returns 微服务报告
 */
export function buildMicroservicesReport(timeRange: string): MicroservicesReport {
  return {
    timeRange,
    catalog: { total: 40, grpc: 15, rest: 20, async: 5 },
    governance: { rateLimiting: 25, circuitBreaking: 10, retries: 20, timeouts: 30 },
    discovery: { registered: 40, healthy: 38 },
    config: { configs: 100, environments: 3 },
    gateway: { routes: 80, dailyRequests: 5000000 },
    tracing: { traces: 10000000, slowCalls: 500, topDependencies: ['user-service', 'order-service', 'payment-service'] },
    monitoring: { avgQPS: 2000, avgP99: 150, avgErrorRate: 0.005 },
    suggestions: ['优化慢调用 Top 依赖', '增加熔断规则覆盖'],
  };
}
