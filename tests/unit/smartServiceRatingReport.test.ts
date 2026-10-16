/**
 * 健澜科技 jlmedaios - 智慧服务评级纯函数单测（M218-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessSmartServiceLevel,
  buildSmartServiceGap,
  buildSmartServiceRatingReport,
} from '../../src/bff/aggregators/smartServiceRatingReportAggregator';

describe('assessSmartServiceLevel', () => {
  it('25 能力 → 5级全程陪伴', () => {
    expect(assessSmartServiceLevel(25).level).toBe(5);
  });

  it('12 能力 → 3级多端一致', () => {
    expect(assessSmartServiceLevel(12).level).toBe(3);
  });

  it('3 能力 → 1级基础服务', () => {
    expect(assessSmartServiceLevel(3).level).toBe(1);
  });
});

describe('buildSmartServiceGap', () => {
  it('当前3 目标5 → 差距2', () => {
    const r = buildSmartServiceGap(3, 5);
    expect(r.gap).toBe(2);
    expect(r.actions.length).toBeGreaterThan(0);
  });
});

describe('buildSmartServiceRatingReport', () => {
  it('生成当前等级数据', () => {
    const r = buildSmartServiceRatingReport('30d');
    expect(r.currentLevel.level).toBeGreaterThan(0);
  });

  it('生成能力数据', () => {
    const r = buildSmartServiceRatingReport('30d');
    expect(r.capabilities.total).toBeGreaterThan(0);
  });

  it('生成体验数据', () => {
    const r = buildSmartServiceRatingReport('30d');
    expect(r.patientExperience.score).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildSmartServiceRatingReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
