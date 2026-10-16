/**
 * 健澜科技 jlmedaios - 质量管理体系纯函数单测（M193-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildQualitySystemReport,
  generateQualityImprovementPlan,
  scoreQualitySystem,
  type QualitySystemData,
} from '../../src/bff/aggregators/qualitySystemAggregator';

describe('scoreQualitySystem', () => {
  it('得分不超过 100', () => {
    const data: QualitySystemData = { committeeEstablished: true, standardsCoverage: 1, trainingHours: 200, inspectionFrequency: 50, pdcaProjects: 50, qccProjects: 10, rcaProjects: 10, nationalGoalsAchieved: 20 };
    expect(scoreQualitySystem(data)).toBeLessThanOrEqual(100);
  });

  it('体系越完善得分越高', () => {
    const low: QualitySystemData = { committeeEstablished: false, standardsCoverage: 0.5, trainingHours: 5, inspectionFrequency: 1, pdcaProjects: 1, qccProjects: 0, rcaProjects: 0, nationalGoalsAchieved: 1 };
    const high: QualitySystemData = { committeeEstablished: true, standardsCoverage: 0.9, trainingHours: 30, inspectionFrequency: 10, pdcaProjects: 5, qccProjects: 3, rcaProjects: 2, nationalGoalsAchieved: 8 };
    expect(scoreQualitySystem(high)).toBeGreaterThan(scoreQualitySystem(low));
  });
});

describe('generateQualityImprovementPlan', () => {
  it('低分 → 生成多项改进', () => {
    const plans = generateQualityImprovementPlan({ score: 60, gaps: [] });
    expect(plans.length).toBeGreaterThan(1);
  });

  it('高分 → 争创奖项', () => {
    const plans = generateQualityImprovementPlan({ score: 90, gaps: [] });
    expect(plans.some((p) => p.includes('质量奖'))).toBe(true);
  });
});

describe('buildQualitySystemReport', () => {
  it('生成组织数据', () => {
    const r = buildQualitySystemReport('质控科', '30d');
    expect(r.organization.committee).toBe(true);
  });

  it('生成国家目标', () => {
    const r = buildQualitySystemReport('质控科', '30d');
    expect(r.nationalGoals.achieved).toBeGreaterThan(0);
  });

  it('生成改进项目', () => {
    const r = buildQualitySystemReport('质控科', '30d');
    expect(r.improvement.pdca).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildQualitySystemReport('质控科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
