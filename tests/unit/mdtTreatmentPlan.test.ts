/**
 * 健澜科技 jlmedaios - MDT 治疗方案纯函数测试（M67-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { confirmStatus, needsScheduling, suggestPlanType } from '../../src/medical-tools/nursing/mdtTreatmentPlan.js';

describe('suggestPlanType', () => {
  it('外科科室 -> surgery', () => {
    expect(suggestPlanType(['胃肠外科'], '手术切除')).toBe('surgery');
  });
  it('化疗关键词 -> chemotherapy', () => {
    expect(suggestPlanType(['肿瘤科'], '术后辅助化疗')).toBe('chemotherapy');
  });
  it('兜底 supportive', () => {
    expect(suggestPlanType(['营养科'], '营养支持')).toBe('supportive');
  });
});

describe('confirmStatus', () => {
  it('draft -> confirmed', () => {
    expect(confirmStatus('draft')).toBe('confirmed');
  });
  it('confirmed 保持', () => {
    expect(confirmStatus('confirmed')).toBe('confirmed');
  });
});

describe('needsScheduling', () => {
  it('confirmed 无排程 -> true', () => {
    expect(needsScheduling('confirmed', null)).toBe(true);
  });
  it('confirmed 有排程 -> false', () => {
    expect(needsScheduling('confirmed', '2026-11-01')).toBe(false);
  });
});
