/**
 * 健澜科技 jlmedaios - 云原生纯函数单测（M197-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessContainerHealth,
  buildCloudNativeReport,
  optimizeResourceUsage,
  type ClusterData,
  type PodData,
} from '../../src/bff/aggregators/cloudNativeAggregator';

describe('assessContainerHealth', () => {
  it('正常 → healthy', () => {
    const pod: PodData = { podName: 'p1', restarts: 0, cpuUsage: 0.5, memoryUsage: 0.6, ready: true };
    expect(assessContainerHealth(pod).status).toBe('healthy');
  });

  it('频繁重启 → critical', () => {
    const pod: PodData = { podName: 'p1', restarts: 10, cpuUsage: 0.5, memoryUsage: 0.6, ready: true };
    expect(assessContainerHealth(pod).status).toBe('critical');
  });

  it('资源过高 → warning', () => {
    const pod: PodData = { podName: 'p1', restarts: 0, cpuUsage: 0.9, memoryUsage: 0.9, ready: true };
    expect(assessContainerHealth(pod).status).toBe('warning');
  });
});

describe('optimizeResourceUsage', () => {
  it('浪费大 → 建议调低 limit', () => {
    const cluster: ClusterData = { cpuRequests: 10, cpuLimits: 100, cpuCapacity: 200, memoryRequests: 20, memoryLimits: 200, memoryCapacity: 400 };
    const r = optimizeResourceUsage(cluster);
    expect(r.cpuRecommendation).toContain('调低');
    expect(r.wastePercent).toBeGreaterThan(0);
  });
});

describe('buildCloudNativeReport', () => {
  it('生成容器数据', () => {
    const r = buildCloudNativeReport('30d');
    expect(r.containers.total).toBeGreaterThan(0);
  });

  it('生成 K8s 数据', () => {
    const r = buildCloudNativeReport('30d');
    expect(r.orchestration.clusters).toBeGreaterThan(0);
  });

  it('生成伸缩数据', () => {
    const r = buildCloudNativeReport('30d');
    expect(r.autoscaling.hpa).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildCloudNativeReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
