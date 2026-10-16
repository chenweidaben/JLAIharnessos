/**
 * 健澜科技 jlmedaios - 云原生 V2 纯函数单测（M216-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessClusterHealth,
  buildCloudNativeReportV2,
  configureHPA,
} from '../../src/bff/aggregators/cloudNativeReportV2Aggregator';

describe('assessClusterHealth', () => {
  it('10 节点 200 Pod → 20 比例 健康', () => {
    const r = assessClusterHealth(10, 200);
    expect(r.healthy).toBe(true);
  });

  it('10 节点 600 Pod → 60 比例 过载', () => {
    const r = assessClusterHealth(10, 600);
    expect(r.healthy).toBe(false);
  });
});

describe('configureHPA', () => {
  it('指标 5 min 2 max 10 → 10 副本', () => {
    const r = configureHPA(5, 2, 10);
    expect(r.replicas).toBe(10);
    expect(r.scaled).toBe(true);
  });

  it('指标 1 min 2 max 10 → 2 副本', () => {
    const r = configureHPA(1, 2, 10);
    expect(r.replicas).toBe(2);
  });
});

describe('buildCloudNativeReportV2', () => {
  it('生成容器数据', () => {
    const r = buildCloudNativeReportV2('30d');
    expect(r.container.images).toBeGreaterThan(0);
  });

  it('生成K8s数据', () => {
    const r = buildCloudNativeReportV2('30d');
    expect(r.kubernetes.nodes).toBeGreaterThan(0);
  });

  it('生成消息队列数据', () => {
    const r = buildCloudNativeReportV2('30d');
    expect(r.messaging.kafka).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildCloudNativeReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
