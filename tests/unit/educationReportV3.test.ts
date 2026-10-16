/**
 * 健澜科技 jlmedaios - 教学 V3 纯函数单测（M207-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTeachingQuality,
  buildEducationReportV3,
  trackCMECredits,
  type CMEStaff,
} from '../../src/bff/aggregators/educationReportV3Aggregator';

describe('assessTeachingQuality', () => {
  it('反馈 0.9 分数 90 → 优秀', () => {
    const r = assessTeachingQuality(0.9, 90);
    expect(r.level).toBe('优秀');
    expect(r.pass).toBe(true);
  });

  it('反馈 0.5 分数 50 → 不合格', () => {
    const r = assessTeachingQuality(0.5, 50);
    expect(r.pass).toBe(false);
  });
});

describe('trackCMECredits', () => {
  it('2 人 1 达标 → 50%', () => {
    const staff: CMEStaff[] = [
      { name: 'A', requiredCredits: 25, earnedCredits: 30 },
      { name: 'B', requiredCredits: 25, earnedCredits: 10 },
    ];
    const r = trackCMECredits(staff);
    expect(r.complianceRate).toBe(0.5);
  });
});

describe('buildEducationReportV3', () => {
  it('生成住培数据', () => {
    const r = buildEducationReportV3('1y');
    expect(r.residency.enrolled).toBeGreaterThan(0);
  });

  it('生成研究生数据', () => {
    const r = buildEducationReportV3('1y');
    expect(r.graduate.master).toBeGreaterThan(0);
  });

  it('生成继教数据', () => {
    const r = buildEducationReportV3('1y');
    expect(r.cme.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildEducationReportV3('1y');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
