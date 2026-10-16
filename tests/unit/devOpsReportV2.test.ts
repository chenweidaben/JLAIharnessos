/**
 * 健澜科技 jlmedaios - DevOps V2 纯函数单测（M216-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDevOpsReportV2,
  calculateDORA,
  designCIPipeline,
  type CIStage,
} from '../../src/bff/aggregators/devOpsReportV2Aggregator';

describe('calculateDORA', () => {
  it('30部署 0.5h 8%失败 0.5h恢复 → 精英', () => {
    const r = calculateDORA(30, 0.5, 0.08, 0.5);
    expect(r.level).toBe('精英');
    expect(r.elite).toBe(true);
  });

  it('10部署 48h 50%失败 48h恢复 → 低', () => {
    const r = calculateDORA(10, 48, 0.5, 48);
    expect(r.level).toBe('低');
  });
});

describe('designCIPipeline', () => {
  it('3 阶段全自动化 → 100% 自动化率', () => {
    const stages: CIStage[] = [
      { name: 'build', automated: true },
      { name: 'test', automated: true },
      { name: 'deploy', automated: true },
    ];
    const r = designCIPipeline(stages);
    expect(r.automationRate).toBe(1);
  });
});

describe('buildDevOpsReportV2', () => {
  it('生成CI/CD数据', () => {
    const r = buildDevOpsReportV2('30d');
    expect(r.cicd.pipelines).toBeGreaterThan(0);
  });

  it('生成发布数据', () => {
    const r = buildDevOpsReportV2('30d');
    expect(r.release.deployments).toBeGreaterThan(0);
  });

  it('生成DORA数据', () => {
    const r = buildDevOpsReportV2('30d');
    expect(r.dora.deploys).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDevOpsReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
