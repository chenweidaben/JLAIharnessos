/**
 * 健澜科技 jlmedaios - 员工体验 V2 纯函数单测（M218-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessWorkload,
  buildEmployeeExperienceReportV2,
  calculateEngagementScore,
} from '../../src/bff/aggregators/employeeExperienceReportV2Aggregator';

describe('calculateEngagementScore', () => {
  it('85 分 → 高敬业度', () => {
    expect(calculateEngagementScore(85).level).toBe('高');
  });

  it('55 分 → 低敬业度', () => {
    expect(calculateEngagementScore(55).level).toBe('低');
  });
});

describe('assessWorkload', () => {
  it('负荷 1.2 产能 1 → 过载', () => {
    const r = assessWorkload(1.2, 1);
    expect(r.overloaded).toBe(true);
  });

  it('负荷 0.8 产能 1 → 不过载', () => {
    const r = assessWorkload(0.8, 1);
    expect(r.overloaded).toBe(false);
  });
});

describe('buildEmployeeExperienceReportV2', () => {
  it('生成入职数据', () => {
    const r = buildEmployeeExperienceReportV2('30d');
    expect(r.onboarding.days30).toBeGreaterThan(0);
  });

  it('生成薪酬数据', () => {
    const r = buildEmployeeExperienceReportV2('30d');
    expect(r.compensation.satisfaction).toBeGreaterThan(0);
  });

  it('生成EAP数据', () => {
    const r = buildEmployeeExperienceReportV2('30d');
    expect(r.eap.sessions).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildEmployeeExperienceReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
