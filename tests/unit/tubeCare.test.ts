/**
 * 健澜科技 jlmedaios - 管路护理纯函数单测（M17-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  computeUnplannedExtubationMetrics,
  isHighRiskTube,
  isValidRemovalType,
  requiresRemovalNote,
} from '../../src/medical-tools/nursing/tubeCare';

describe('tubeCare 高危管路', () => {
  it('cvc/arterial_line 为高危', () => {
    expect(isHighRiskTube('cvc')).toBe(true);
    expect(isHighRiskTube('arterial_line')).toBe(true);
  });
  it('尿/胃管为非高危', () => {
    expect(isHighRiskTube('urinary_catheter')).toBe(false);
    expect(isHighRiskTube('ng_tube')).toBe(false);
  });
});

describe('tubeCare 拔管分类', () => {
  it('planned/unplanned 合法', () => {
    expect(isValidRemovalType('planned')).toBe(true);
    expect(isValidRemovalType('unplanned')).toBe(true);
    expect(isValidRemovalType('x')).toBe(false);
  });
  it('unplanned 必填 note', () => {
    expect(requiresRemovalNote('unplanned')).toBe(true);
    expect(requiresRemovalNote('planned')).toBe(false);
  });
});

describe('tubeCare NQI_UNPLANNED_EXTUBATION 分子分母', () => {
  it('分母=有在管管路的不同患者数，分子=unplanned 例数', () => {
    const m = computeUnplannedExtubationMetrics([
      { patientId: 'p1', inPlace: true, unplanned: false },
      { patientId: 'p1', inPlace: false, unplanned: true },
      { patientId: 'p2', inPlace: true, unplanned: true },
    ]);
    expect(m.fractions.rate.denominator).toBe(2);
    expect(m.fractions.rate.numerator).toBe(2);
    expect(m.rate).toBe(100);
  });
  it('分母为 0 时率 0，不除零', () => {
    const m = computeUnplannedExtubationMetrics([]);
    expect(m.rate).toBe(0);
    expect(m.fractions.rate).toEqual({ numerator: 0, denominator: 0 });
  });
  it('不同患者去重计分母', () => {
    const m = computeUnplannedExtubationMetrics([
      { patientId: 'p1', inPlace: true, unplanned: false },
      { patientId: 'p1', inPlace: true, unplanned: false },
      { patientId: 'p1', inPlace: true, unplanned: false },
    ]);
    expect(m.fractions.rate.denominator).toBe(1);
    expect(m.fractions.rate.numerator).toBe(0);
  });
});
