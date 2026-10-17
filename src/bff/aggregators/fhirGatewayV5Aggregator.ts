/**
 * 健澜科技 jlmedaios - FHIR 资源建模与网关 V5 纯函数（M281-A）
 *
 * buildFHIRResourceV5 / validateFHIRV5 / normalizeFHIRV5 / buildFHIRGatewayV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** FHIR 资源 */
export interface FHIRResource {
  resourceType: string;
  id: string;
  meta?: { versionId: string; lastUpdated: string };
  status?: string;
  [key: string]: unknown;
}

/** 网关日志 */
export interface FHIRGatewayLog {
  endpoint: string;
  method: string;
  resourceType: string;
  status: number;
  latencyMs: number;
  caller: string;
}

/**
 * 构造 FHIR 资源 V5（纯函数）：补 meta 字段。
 *
 * @param type 资源类型
 * @param data 业务数据
 * @returns FHIR 资源
 */
export function buildFHIRResourceV5(type: string, data: { id: string; status?: string }): FHIRResource {
  return {
    resourceType: type,
    id: data.id,
    status: data.status ?? "active",
    meta: { versionId: "1", lastUpdated: new Date().toISOString() },
  };
}

/**
 * 校验 FHIR 资源 V5（纯函数）：resourceType 与 id 必填。
 *
 * @param resource FHIR 资源
 * @returns 校验结果
 */
export function validateFHIRV5(resource: FHIRResource): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!resource.resourceType) errors.push("缺少 resourceType");
  if (!resource.id) errors.push("缺少 id");
  if (!["Patient", "Observation", "Condition", "Encounter", "DiagnosticReport"].includes(resource.resourceType)) {
    errors.push(`不支持的资源类型: ${resource.resourceType}`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 归一化 FHIR 资源 V5（纯函数）：status 小写、去空 meta。
 *
 * @param resource FHIR 资源
 * @returns 归一化后资源
 */
export function normalizeFHIRV5(resource: FHIRResource): FHIRResource {
  const normalized: FHIRResource = {
    ...resource,
    resourceType: resource.resourceType,
    id: resource.id,
  };
  if (resource.status) normalized.status = String(resource.status).toLowerCase();
  return normalized;
}

/** 网关看板输出 */
export interface FHIRGatewayV5Report {
  totalCalls: number;
  errorRate: number;
  avgLatencyMs: number;
  topResources: Record<string, number>;
}

/**
 * 构建 FHIR 网关看板（纯函数）。
 *
 * @param logs 调用日志
 * @returns 看板
 */
export function buildFHIRGatewayV5Report(logs: FHIRGatewayLog[]): FHIRGatewayV5Report {
  const totalCalls = logs.length;
  const errorCount = logs.filter((l) => l.status >= 400).length;
  const errorRate = totalCalls > 0 ? Math.round((errorCount / totalCalls) * 1000) / 10 : 0;
  const avgLatencyMs = totalCalls > 0
    ? Math.round((logs.reduce((s, l) => s + l.latencyMs, 0) / totalCalls) * 10) / 10
    : 0;
  const topResources: Record<string, number> = {};
  for (const l of logs) {
    topResources[l.resourceType] = (topResources[l.resourceType] ?? 0) + 1;
  }
  return { totalCalls, errorRate, avgLatencyMs, topResources };
}
