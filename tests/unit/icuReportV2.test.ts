/**
 * 健澜科技 jlmedaios - 重症医学 V2 纯函数单测（M224-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessSOFA,
  buildICUReportV2,
  calculateAPACHEII,
} from '../../src/bff/aggregators/icuReportV2Aggregator';

describe('calculateAPACHEII', () => {
  it('5体征 3化验 → 26分 死亡率65%', () => {
    const r = calculateAPACHEII(5, 3);
    expect(r.score).toBe(26);
  });
});

describe('assessSOFA', () => {
  it('3器官功能不全 → 12分 危重', () => {
    expect(assessSOFA(6, 3).critical).toBe(true);
  });

  it('1器官功能不全 → 4分 非危重', () => {
    expect(assessSOFA(6, 1).critical).toBe(false);
  });
});

describe('buildICUReportV2', () => {
  it('生成收治数据', () => {
    const r = buildICUReportV2('30d');
    expect(r.admission.patients).toBeGreaterThan(0);
  });

  it('生成器官支持数据', () => {
    const r = buildICUReportV2('30d');
    expect(r.organ.respiratory).toBeGreaterThan(0);
  });

  it('生成感染数据', () => {
    const r = buildICUReportV2('30d');
    expect(r.infection.vap).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildICUReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
