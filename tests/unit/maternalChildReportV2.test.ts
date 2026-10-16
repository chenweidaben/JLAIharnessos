/**
 * 健澜科技 jlmedaios - 妇幼健康 V2 纯函数单测（M221-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPregnancyRisk,
  buildMaternalChildReportV2,
  trackChildGrowth,
} from '../../src/bff/aggregators/maternalChildReportV2Aggregator';

describe('assessPregnancyRisk', () => {
  it('3个危险因素 → 高风险', () => {
    expect(assessPregnancyRisk(3).high).toBe(true);
  });

  it('1个危险因素 → 中风险', () => {
    expect(assessPregnancyRisk(1).level).toBe('中风险');
  });
});

describe('trackChildGrowth', () => {
  it('10kg 100cm → BMI 10 异常', () => {
    expect(trackChildGrowth(12, 10, 100).normal).toBe(false);
  });

  it('15kg 100cm → BMI 15 正常', () => {
    expect(trackChildGrowth(12, 15, 100).normal).toBe(true);
  });
});

describe('buildMaternalChildReportV2', () => {
  it('生成产检数据', () => {
    const r = buildMaternalChildReportV2('30d');
    expect(r.antenatal.visits).toBeGreaterThan(0);
  });

  it('生成分娩数据', () => {
    const r = buildMaternalChildReportV2('30d');
    expect(r.labor.analgesia).toBeGreaterThan(0);
  });

  it('生成筛查数据', () => {
    const r = buildMaternalChildReportV2('30d');
    expect(r.gynecology.cervical).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMaternalChildReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
