/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警引擎纯函数单测（M17-A）
 *
 * 覆盖分层边界、预防建议确定性、高危无执行预警、NQI 指标分子分母。
 * 纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  scorePressureUlcer,
  scoreFall,
  classifyLevel,
  recommendPreventions,
  detectNoPrevention,
  computeRiskMetrics,
  type RiskMetricRow,
} from '../../src/medical-tools/nursing/riskWarning.js';

describe('M17-A 量表打分复用（mobileNursing）', () => {
  it('Braden 六项求和', () => {
    const s = scorePressureUlcer({ sensory: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, frictionShear: 1 });
    expect(s).toBe(6);
  });
  it('Morse 六项求和', () => {
    const s = scoreFall({ fallHistory: 25, multipleDiagnoses: 15, ambulationAid: 0, ivTherapy: 20, gait: 0, mentalStatus: 0 });
    expect(s).toBe(60);
  });
});

describe('M17-A classifyLevel 分层边界', () => {
  it('压疮：≤9 高 / 10-12 中 / ≥13 低', () => {
    expect(classifyLevel('pressure_ulcer', 9)).toBe('high');
    expect(classifyLevel('pressure_ulcer', 12)).toBe('medium');
    expect(classifyLevel('pressure_ulcer', 10)).toBe('medium');
    expect(classifyLevel('pressure_ulcer', 13)).toBe('low');
    expect(classifyLevel('pressure_ulcer', 20)).toBe('low');
  });
  it('跌倒：≥45 高 / 25-44 中 / <25 低', () => {
    expect(classifyLevel('fall', 45)).toBe('high');
    expect(classifyLevel('fall', 25)).toBe('medium');
    expect(classifyLevel('fall', 24)).toBe('low');
    expect(classifyLevel('fall', 0)).toBe('low');
  });
  it('非法 riskType 兜底 low', () => {
    expect(classifyLevel('other' as never, 0)).toBe('low');
  });
});

describe('M17-A recommendPreventions 确定性建议', () => {
  it('压疮高危措施数量多于中危多于低危', () => {
    const high = recommendPreventions('pressure_ulcer', 'high');
    const medium = recommendPreventions('pressure_ulcer', 'medium');
    const low = recommendPreventions('pressure_ulcer', 'low');
    expect(high.length).toBeGreaterThan(medium.length);
    expect(medium.length).toBeGreaterThan(low.length);
    // measureCode 稳定
    expect(high[0].measureCode).toBe('TURN_Q2H');
  });
  it('跌倒高危含床栏/警示手环', () => {
    const high = recommendPreventions('fall', 'high').map((m) => m.measureCode);
    expect(high).toContain('BED_RAILS_UP');
    expect(high).toContain('FALL_WRISTBAND');
  });
  it('同入参幂等', () => {
    expect(recommendPreventions('pressure_ulcer', 'high')).toEqual(recommendPreventions('pressure_ulcer', 'high'));
  });
});

describe('M17-A detectNoPrevention 高危无执行预警', () => {
  const assess = (level: 'low' | 'medium' | 'high', statuses: string[]) => ({
    assessmentId: 'a1', visitId: 'v1', riskType: 'pressure_ulcer' as const, level, totalScore: 8,
    preventions: statuses.map((s) => ({ status: s })),
  });
  it('高危且无 executed => 预警', () => {
    const w = detectNoPrevention([assess('high', ['suggested', 'accepted'])]);
    expect(w).toHaveLength(1);
    expect(w[0].reason).toContain('压疮');
  });
  it('高危但有 executed => 不预警', () => {
    expect(detectNoPrevention([assess('high', ['accepted', 'executed'])])).toHaveLength(0);
  });
  it('中/低危一律不预警', () => {
    expect(detectNoPrevention([assess('medium', []), assess('low', [])])).toHaveLength(0);
  });
});

describe('M17-A computeRiskMetrics 分子分母', () => {
  const rows: RiskMetricRow[] = [
    { riskType: 'pressure_ulcer', latestLevel: 'high', eventOccurred: false },
    { riskType: 'pressure_ulcer', latestLevel: 'low', eventOccurred: true },
    { riskType: 'pressure_ulcer', latestLevel: null, eventOccurred: false },
    { riskType: 'fall', latestLevel: 'high', eventOccurred: true },
    { riskType: 'fall', latestLevel: 'medium', eventOccurred: false },
  ];
  it('压疮高危率 = 1/2（已评估2条，高危1）', () => {
    const m = computeRiskMetrics(rows, 10);
    expect(m.fractions.pressureHighRiskRate).toEqual({ numerator: 1, denominator: 2 });
    expect(m.pressureHighRiskRate).toBe(50);
  });
  it('跌倒高危率 = 1/2（已评估2条，高危1）', () => {
    const m = computeRiskMetrics(rows, 10);
    expect(m.fractions.fallHighRiskRate).toEqual({ numerator: 1, denominator: 2 });
  });
  it('事件发生率 = 事件数 / 总住院人数', () => {
    const m = computeRiskMetrics(rows, 10);
    expect(m.fractions.pressureInjuryRate).toEqual({ numerator: 1, denominator: 10 });
    expect(m.fractions.fallIncidentRate).toEqual({ numerator: 1, denominator: 10 });
  });
  it('空数据分母为 0 时不抛错，率为 0', () => {
    const m = computeRiskMetrics([], 0);
    expect(m.pressureHighRiskRate).toBe(0);
    expect(m.fractions.fallIncidentRate).toEqual({ numerator: 0, denominator: 0 });
  });
});
