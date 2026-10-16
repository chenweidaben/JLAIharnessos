/**
 * 健澜科技 jlmedaios - 教学培训 V2 纯函数单测（M219-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTeachingQuality,
  buildTeachingReportV2,
  trackCMECredits,
} from '../../src/bff/aggregators/teachingReportV2Aggregator';

describe('assessTeachingQuality', () => {
  it('95分 → 优秀', () => {
    expect(assessTeachingQuality(95).level).toBe('优秀');
  });

  it('65分 → 待改进', () => {
    expect(assessTeachingQuality(65).level).toBe('待改进');
  });
});

describe('trackCMECredits', () => {
  it('100职工 3000学分 → 30分合规', () => {
    const r = trackCMECredits(100, 3000);
    expect(r.avgCredits).toBe(30);
    expect(r.compliance).toBe(true);
  });

  it('100职工 2000学分 → 20分不合规', () => {
    const r = trackCMECredits(100, 2000);
    expect(r.compliance).toBe(false);
  });
});

describe('buildTeachingReportV2', () => {
  it('生成住培数据', () => {
    const r = buildTeachingReportV2('30d');
    expect(r.residency.bases).toBeGreaterThan(0);
  });

  it('生成研究生数据', () => {
    const r = buildTeachingReportV2('30d');
    expect(r.graduate.programs).toBeGreaterThan(0);
  });

  it('生成继教数据', () => {
    const r = buildTeachingReportV2('30d');
    expect(r.cme.credits).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildTeachingReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
