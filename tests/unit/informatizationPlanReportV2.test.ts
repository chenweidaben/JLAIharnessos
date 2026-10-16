/**
 * 健澜科技 jlmedaios - 信息化规划 V2 纯函数单测（M227-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessInformatizationMaturity,
  buildInformatizationPlanReportV2,
  buildITRoadmap,
} from '../../src/bff/aggregators/informatizationPlanReportV2Aggregator';

describe('assessInformatizationMaturity', () => {
  it('8项达标 → 五级', () => {
    expect(assessInformatizationMaturity(8).level).toBe('五级');
  });

  it('4项达标 → 三级', () => {
    expect(assessInformatizationMaturity(4).level).toBe('三级');
  });
});

describe('buildITRoadmap', () => {
  it('15项目 预算3000万 → 平均200万/项目', () => {
    const r = buildITRoadmap(15, 30000000);
    expect(r.avgBudget).toBe(2000000);
  });
});

describe('buildInformatizationPlanReportV2', () => {
  it('生成战略数据', () => {
    const r = buildInformatizationPlanReportV2('30d');
    expect(r.strategy.horizon).toBeGreaterThan(0);
  });

  it('生成架构数据', () => {
    const r = buildInformatizationPlanReportV2('30d');
    expect(r.architecture.application).toBeGreaterThan(0);
  });

  it('生成项目数据', () => {
    const r = buildInformatizationPlanReportV2('30d');
    expect(r.projects.planned).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInformatizationPlanReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
