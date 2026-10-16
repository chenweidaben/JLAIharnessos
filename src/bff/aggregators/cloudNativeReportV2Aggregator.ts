/**
 * 健澜科技 jlmedaios - 云原生 V2 纯函数（M216-A）
 *
 * buildCloudNativeReportV2 / assessClusterHealth / configureHPA
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估集群健康（纯函数）。
 *
 * @param nodes 节点数
 * @param pods Pod 数
 * @returns 健康度
 */
export function assessClusterHealth(nodes: number, pods: number): { healthy: boolean; status: string } {
  const ratio = pods / Math.max(nodes, 1);
  const healthy = ratio <= 50;
  return { healthy, status: healthy ? '健康' : '过载' };
}

/**
 * 配置 HPA（纯函数）。
 *
 * @param metrics 当前指标
 * @param min 最小副本
 * @param max 最大副本
 * @returns 副本数
 */
export function configureHPA(metrics: number, min: number, max: number): { replicas: number; scaled: boolean } {
  const target = Math.round(metrics * 2);
  const replicas = Math.min(max, Math.max(min, target));
  return { replicas, scaled: replicas > min };
}

/** 云原生 V2 报告输出 */
export interface CloudNativeReportV2 {
  timeRange: string;
  container: { images: number; scanned: number };
  kubernetes: { clusters: number; nodes: number; hpa: number };
  serviceMesh: { istio: boolean };
  config: { center: boolean };
  registry: { service: boolean };
  messaging: { kafka: number };
  storage: { object: boolean };
  security: { rbac: boolean };
  suggestions: string[];
}

/**
 * 构建云原生 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 云原生 V2 报告
 */
export function buildCloudNativeReportV2(timeRange: string): CloudNativeReportV2 {
  return {
    timeRange,
    container: { images: 200, scanned: 180 },
    kubernetes: { clusters: 3, nodes: 50, hpa: 10 },
    serviceMesh: { istio: true },
    config: { center: true },
    registry: { service: true },
    messaging: { kafka: 20 },
    storage: { object: true },
    security: { rbac: true },
    suggestions: ['提高镜像扫描覆盖率', '扩展 HPA 自动伸缩'],
  };
}
