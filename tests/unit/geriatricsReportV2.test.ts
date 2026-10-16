/**
 * 健澜科技 jlmedaios - 老年健康 V2 纯函数单测（M221-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessFrailty,
  buildGeriatricsReportV2,
  screenPolypharmacy,
} from '../../src/bff/aggregators/geriatricsReportV2Aggregator';

describe('assessFrailty', () => {
  it('3项符合 → 衰弱', () => {
    expect(assessFrailty(3).frail).toBe(true);
  });

  it('1项符合 → 衰弱前期', () => {
    expect(assessFrailty(1).level).toBe('衰弱前期');
  });
});

describe('screenPolypharmacy', () => {
  it('10种药 → 多重用药', () => {
    expect(screenPolypharmacy(10).poly).toBe(true);
  });

  it('3种药 → 不多重', () => {
    expect(screenPolypharmacy(3).poly).toBe(false);
  });
});

describe('buildGeriatricsReportV2', () => {
  it('生成CGA数据', () => {
    const r = buildGeriatricsReportV2('30d');
    expect(r.cga.assessed).toBeGreaterThan(0);
  });

  it('生成综合征数据', () => {
    const r = buildGeriatricsReportV2('30d');
    expect(r.syndrome.frailty).toBeGreaterThan(0);
  });

  it('生成认知数据', () => {
    const r = buildGeriatricsReportV2('30d');
    expect(r.cognition.mmse).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildGeriatricsReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
