/**
 * 健澜科技 jlmedaios - 云原生深化纯函数（M197-A）
 *
 * buildCloudNativeReport / assessContainerHealth / optimizeResourceUsage
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** Pod 数据 */
export interface PodData {
  podName: string;
  restarts: number;
  cpuUsage: number;
  memoryUsage: number;
  ready: boolean;
}

/**
 * 容器健康评估（纯函数）。
 *
 * @param pod Pod 数据
 * @returns 健康状态
 */
export function assessContainerHealth(pod: PodData): { status: 'healthy' | 'warning' | 'critical'; reason: string } {
  if (!pod.ready || pod.restarts > 5) return { status: 'critical', reason: 'Pod 未就绪或频繁重启' };
  if (pod.cpuUsage > 0.85 || pod.memoryUsage > 0.85) return { status: 'warning', reason: '资源使用率过高' };
  return { status: 'healthy', reason: '正常' };
}

/** 集群资源数据 */
export interface ClusterData {
  cpuRequests: number;
  cpuLimits: number;
  cpuCapacity: number;
  memoryRequests: number;
  memoryLimits: number;
  memoryCapacity: number;
}

/**
 * 资源使用优化（纯函数）。
 *
 * @param cluster 集群资源数据
 * @returns 优化建议
 */
export function optimizeResourceUsage(cluster: ClusterData): { cpuRecommendation: string; memoryRecommendation: string; wastePercent: number } {
  const cpuWaste = Math.max(0, (cluster.cpuLimits - cluster.cpuRequests) / cluster.cpuCapacity);
  const memoryWaste = Math.max(0, (cluster.memoryLimits - cluster.memoryRequests) / cluster.memoryCapacity);
  const wastePercent = Math.round(((cpuWaste + memoryWaste) / 2) * 100);
  return {
    cpuRecommendation: cpuWaste > 0.3 ? '调低 CPU limit' : '保持当前配置',
    memoryRecommendation: memoryWaste > 0.3 ? '调低内存 limit' : '保持当前配置',
    wastePercent,
  };
}

/** 云原生报告输出 */
export interface CloudNativeReport {
  timeRange: string;
  containers: { total: number; images: number; restarts: number };
  orchestration: { clusters: number; pods: number; nodes: number; cpuUtilization: number; memoryUtilization: number };
  serviceMesh: { istioEnabled: boolean; trafficManaged: number; circuitBreaker: number };
  microservices: { services: number };
  autoscaling: { hpa: number; vpa: number; keda: number };
  environments: { dev: number; staging: number; prod: number };
  multiCloud: { clouds: number };
  security: { mTLS: boolean; imageScanning: boolean };
  suggestions: string[];
}

/**
 * 构建云原生报告。
 *
 * @param timeRange 时间范围
 * @returns 云原生报告
 */
export function buildCloudNativeReport(timeRange: string): CloudNativeReport {
  const clusterData: ClusterData = {
    cpuRequests: 50,
    cpuLimits: 100,
    cpuCapacity: 200,
    memoryRequests: 100,
    memoryLimits: 200,
    memoryCapacity: 400,
  };
  const optimization = optimizeResourceUsage(clusterData);

  return {
    timeRange,
    containers: { total: 200, images: 50, restarts: 10 },
    orchestration: { clusters: 3, pods: 200, nodes: 20, cpuUtilization: 0.65, memoryUtilization: 0.70 },
    serviceMesh: { istioEnabled: true, trafficManaged: 150, circuitBreaker: 10 },
    microservices: { services: 40 },
    autoscaling: { hpa: 15, vpa: 5, keda: 3 },
    environments: { dev: 2, staging: 1, prod: 1 },
    multiCloud: { clouds: 2 },
    security: { mTLS: true, imageScanning: true },
    suggestions: [`CPU 资源浪费 ${optimization.wastePercent}%，${optimization.cpuRecommendation}`, '扩大多集群覆盖'],
  };
}
