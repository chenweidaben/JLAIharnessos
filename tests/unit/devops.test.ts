/**
 * 健澜科技 jlmedaios - DevOps 纯函数单测（M197-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDevOpsReport,
  calculateDevOpsDORA,
  optimizeCIPipeline,
  type DORAMetrics,
  type PipelineData,
} from '../../src/bff/aggregators/devopsAggregator';

describe('calculateDevOpsDORA', () => {
  it('优秀指标 → elite', () => {
    const metrics: DORAMetrics = { deploymentFrequency: 3, leadTimeHours: 12, changeFailRate: 0.05, mttrMinutes: 30 };
    expect(calculateDevOpsDORA(metrics).level).toBe('elite');
  });

  it('差指标 → low', () => {
    const metrics: DORAMetrics = { deploymentFrequency: 0.1, leadTimeHours: 720, changeFailRate: 0.5, mttrMinutes: 1440 };
    expect(calculateDevOpsDORA(metrics).level).toBe('low');
  });
});

describe('optimizeCIPipeline', () => {
  it('构建慢 → 建议并行化', () => {
    const pipeline: PipelineData = { buildTimeMinutes: 60, testCoverage: 0.85, successRate: 0.95 };
    const r = optimizeCIPipeline(pipeline);
    expect(r.suggestions.some((s) => s.includes('并行'))).toBe(true);
  });
});

describe('buildDevOpsReport', () => {
  it('生成代码数据', () => {
    const r = buildDevOpsReport('30d');
    expect(r.code.repos).toBeGreaterThan(0);
  });

  it('生成 CI/CD 数据', () => {
    const r = buildDevOpsReport('30d');
    expect(r.cicd.builds).toBeGreaterThan(0);
  });

  it('生成 DORA 数据', () => {
    const r = buildDevOpsReport('30d');
    expect(r.dora.level).toBeDefined();
  });

  it('生成建议', () => {
    const r = buildDevOpsReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
