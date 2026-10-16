/**
 * 健澜科技 jlmedaios - 患者安全纯函数单测（M193-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzeRootCause,
  buildPatientSafetyReport,
  classifyAdverseEvent,
  type AdverseEvent,
} from '../../src/bff/aggregators/patientSafetyAggregator';

describe('classifyAdverseEvent', () => {
  it('无伤害无后果 → I 级', () => {
    const event: AdverseEvent = { type: '用药差错', causedHarm: false, hadConsequence: false, isHiddenDanger: false };
    expect(classifyAdverseEvent(event)).toBe('I');
  });

  it('有伤害有后果 → II 级', () => {
    const event: AdverseEvent = { type: '用药差错', causedHarm: true, hadConsequence: true, isHiddenDanger: false };
    expect(classifyAdverseEvent(event)).toBe('II');
  });

  it('有后果无伤害 → III 级', () => {
    const event: AdverseEvent = { type: '跌倒', causedHarm: false, hadConsequence: true, isHiddenDanger: false };
    expect(classifyAdverseEvent(event)).toBe('III');
  });

  it('隐患 → IV 级', () => {
    const event: AdverseEvent = { type: '隐患', causedHarm: false, hadConsequence: false, isHiddenDanger: true };
    expect(classifyAdverseEvent(event)).toBe('IV');
  });
});

describe('analyzeRootCause', () => {
  it('用药差错 → 药品管理根因', () => {
    const event: AdverseEvent = { type: '用药差错', causedHarm: true, hadConsequence: true, isHiddenDanger: false };
    expect(analyzeRootCause(event).some((c) => c.includes('药品'))).toBe(true);
  });

  it('跌倒 → 环境风险根因', () => {
    const event: AdverseEvent = { type: '跌倒', causedHarm: true, hadConsequence: true, isHiddenDanger: false };
    expect(analyzeRootCause(event).some((c) => c.includes('环境'))).toBe(true);
  });
});

describe('buildPatientSafetyReport', () => {
  it('生成国家目标', () => {
    const r = buildPatientSafetyReport('医务处', '30d');
    expect(r.nationalGoals.achieved).toBeGreaterThan(0);
  });

  it('生成不良事件统计', () => {
    const r = buildPatientSafetyReport('医务处', '30d');
    expect(r.adverseEvents.total).toBeGreaterThan(0);
  });

  it('生成安全文化评分', () => {
    const r = buildPatientSafetyReport('医务处', '30d');
    expect(r.safetyCulture.score).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPatientSafetyReport('医务处', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
