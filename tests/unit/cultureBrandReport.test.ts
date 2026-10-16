/**
 * 健澜科技 jlmedaios - 文化品牌纯函数单测（M213-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPatientExperience,
  buildCultureBrandReport,
  scoreBrandAwareness,
} from '../../src/bff/aggregators/cultureBrandReportAggregator';

describe('scoreBrandAwareness', () => {
  it('[90, 85, 88] → 87.7 高', () => {
    const r = scoreBrandAwareness([90, 85, 88]);
    expect(r.level).toBe('高');
  });

  it('[50, 55, 60] → 55 低', () => {
    const r = scoreBrandAwareness([50, 55, 60]);
    expect(r.level).toBe('低');
  });
});

describe('assessPatientExperience', () => {
  it('[95, 90, 92] → 92.3 优秀', () => {
    const r = assessPatientExperience([95, 90, 92]);
    expect(r.level).toBe('优秀');
  });

  it('[70, 75, 72] → 72.3 待改进', () => {
    const r = assessPatientExperience([70, 75, 72]);
    expect(r.level).toBe('待改进');
  });
});

describe('buildCultureBrandReport', () => {
  it('生成精神数据', () => {
    const r = buildCultureBrandReport('30d');
    expect(r.spirit.motto).toBeTruthy();
  });

  it('生成故事数据', () => {
    const r = buildCultureBrandReport('30d');
    expect(r.stories.published).toBeGreaterThan(0);
  });

  it('生成公益数据', () => {
    const r = buildCultureBrandReport('30d');
    expect(r.charity.events).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildCultureBrandReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
