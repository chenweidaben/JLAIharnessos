/**
 * 健澜科技 jlmedaios - 不良事件后评估纯函数单测（M17-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  computeEventRates,
  isValidPressureStage,
  missingFallReviewFields,
  pressureStageLabel,
} from '../../src/medical-tools/nursing/eventReview';

describe('eventReview 压疮分级', () => {
  it('stage 映射中文', () => {
    expect(pressureStageLabel('pressure_injury_stage2')).toBe('二期压力性损伤');
    expect(pressureStageLabel('pressure_injury_stage3')).toBe('三期压力性损伤');
    expect(pressureStageLabel('pressure_injury_stage4')).toBe('四期压力性损伤');
  });
  it('校验合法分级', () => {
    expect(isValidPressureStage('pressure_injury_stage2')).toBe(true);
    expect(isValidPressureStage('x')).toBe(false);
  });
});

describe('eventReview 跌倒后评估必填', () => {
  it('缺多项返回字段名', () => {
    const m = missingFallReviewFields({});
    expect(m).toContain('occurredAt');
    expect(m).toContain('location');
    expect(m).toContain('circumstances');
    expect(m).toContain('injuries');
    expect(m).toContain('familyNotified');
  });
  it('全填返回空', () => {
    expect(missingFallReviewFields({
      occurredAt: '2026-10-12', location: '病房', circumstances: '下床跌倒', injuries: '无', familyNotified: true,
    })).toEqual([]);
  });
});

describe('eventReview NQI 分子分母', () => {
  it('压疮/跌倒分别计数，分母=在院就诊数', () => {
    const m = computeEventRates([
      { eventType: 'pressure_injury_stage2' },
      { eventType: 'pressure_injury_stage3' },
      { eventType: 'fall' },
    ], 100);
    expect(m.fractions.pressureInjury.numerator).toBe(2);
    expect(m.fractions.fall.numerator).toBe(1);
    expect(m.pressureInjuryRate).toBe(2);
    expect(m.fallRate).toBe(1);
  });
  it('分母 0 不除零', () => {
    const m = computeEventRates([{ eventType: 'fall' }], 0);
    expect(m.fallRate).toBe(0);
  });
});
