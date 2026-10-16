/**
 * 健澜科技 jlmedaios - AI 中台 V2 纯函数单测（M215-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessModelPerformance,
  buildAIPlatformReportV2,
  trackModelDrift,
} from '../../src/bff/aggregators/aiPlatformReportV2Aggregator';

describe('assessModelPerformance', () => {
  it('[0.95, 0.92, 0.9] → 0.923 优秀', () => {
    const r = assessModelPerformance(0.95, 0.92, 0.9);
    expect(r.level).toBe('优秀');
  });

  it('[0.7, 0.72, 0.74] → 0.72 待改进', () => {
    const r = assessModelPerformance(0.7, 0.72, 0.74);
    expect(r.level).toBe('待改进');
  });
});

describe('trackModelDrift', () => {
  it('特征漂移 0.15 → 告警', () => {
    const r = trackModelDrift(0.15, 0.05);
    expect(r.alert).toBe(true);
  });

  it('特征漂移 0.05 → 不告警', () => {
    const r = trackModelDrift(0.05, 0.03);
    expect(r.alert).toBe(false);
  });
});

describe('buildAIPlatformReportV2', () => {
  it('生成模型数据', () => {
    const r = buildAIPlatformReportV2('30d');
    expect(r.modelRegistry.models).toBeGreaterThan(0);
  });

  it('生成推理数据', () => {
    const r = buildAIPlatformReportV2('30d');
    expect(r.inference.online).toBeGreaterThan(0);
  });

  it('生成特征数据', () => {
    const r = buildAIPlatformReportV2('30d');
    expect(r.featureStore.features).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAIPlatformReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
