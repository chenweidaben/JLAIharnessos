/**
 * 健澜科技 jlmedaios - VTE 规则引擎纯函数单测（M13-A）
 *
 * 覆盖 Caprini/Padua 各分值与分层边界、出血风险、预防建议、mismatch、质控指标 fractions。
 * 纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  scoreCaprini,
  capriniLevel,
  scorePadua,
  paduaLevel,
  assessBleeding,
  recommendPrevention,
  detectPreventionMismatch,
  computeVteMetrics,
  CAPRINI_FACTORS,
  PADUA_FACTORS,
  BLEEDING_FACTORS,
  type VteLevel,
} from '../../src/medical-tools/vte/vteRisk.js';

describe('M13-A Caprini 评分与分层', () => {
  it('累加命中因素分值，展开明细', () => {
    const r = scoreCaprini(['age_61_74', 'major_surgery_gt45min', 'active_cancer']);
    expect(r.score).toBe(2 + 2 + 2);
    expect(r.factors).toHaveLength(3);
    expect(r.unknownKeys).toEqual([]);
  });

  it('未知 key 被忽略且记录，不报错', () => {
    const r = scoreCaprini(['age_41_60', 'not_a_real_factor']);
    expect(r.score).toBe(1);
    expect(r.unknownKeys).toEqual(['not_a_real_factor']);
  });

  it('空输入/重复 key 幂等', () => {
    expect(scoreCaprini([]).score).toBe(0);
    const dup = scoreCaprini(['age_ge75', 'age_ge75']);
    expect(dup.score).toBe(3);
    expect(dup.factors).toHaveLength(1);
  });

  it.each([
    [0, 'low'],
    [1, 'low'],
    [2, 'medium'],
    [3, 'high'],
    [4, 'high'],
    [5, 'very_high'],
    [8, 'very_high'],
  ])('分层边界 score=%i -> %s', (score, level) => {
    expect(capriniLevel(score)).toBe(level as VteLevel);
  });
});

describe('M13-A Padua 评分与分层', () => {
  it('累加分值', () => {
    const r = scorePadua(['active_cancer', 'bedridden_ge3d', 'age_ge70']);
    expect(r.score).toBe(3 + 3 + 1);
  });

  it.each([
    [0, 'low'],
    [3, 'low'],
    [4, 'high'],
    [7, 'high'],
  ])('分层边界 score=%i -> %s', (score, level) => {
    expect(paduaLevel(score)).toBe(level as VteLevel);
  });
});

describe('M13-A 出血风险', () => {
  it('无因素 => low', () => {
    const r = assessBleeding([]);
    expect(r.level).toBe('low');
    expect(r.factors).toHaveLength(0);
  });
  it('命中任一 => high，展开明细', () => {
    const r = assessBleeding(['active_bleeding', 'thrombocytopenia']);
    expect(r.level).toBe('high');
    expect(r.factors).toHaveLength(2);
  });
});

describe('M13-A 确定性预防建议', () => {
  it('Caprini 极高危/高危 => 药物+机械(IPC)', () => {
    for (const lv of ['high', 'very_high'] as const) {
      const r = recommendPrevention({ scale: 'caprini', vteLevel: lv, bleedingLevel: 'low' });
      expect(r.mechanical.map((m) => m.method)).toContain('ipc');
      expect(r.pharmacological.some((p) => p.method === 'lmwh' && !p.deferred)).toBe(true);
    }
  });
  it('Caprini 中危 => 仅机械建议', () => {
    const r = recommendPrevention({ scale: 'caprini', vteLevel: 'medium', bleedingLevel: 'low' });
    expect(r.mechanical.length).toBeGreaterThan(0);
    expect(r.pharmacological).toHaveLength(0);
  });
  it('Caprini 低危 => 无措施建议', () => {
    const r = recommendPrevention({ scale: 'caprini', vteLevel: 'low', bleedingLevel: 'low' });
    expect(r.mechanical).toHaveLength(0);
    expect(r.pharmacological).toHaveLength(0);
  });
  it('Padua 高危 => 药物+机械；低危 => 无', () => {
    const hi = recommendPrevention({ scale: 'padua', vteLevel: 'high', bleedingLevel: 'low' });
    expect(hi.pharmacological.some((p) => p.method === 'lmwh')).toBe(true);
    const lo = recommendPrevention({ scale: 'padua', vteLevel: 'low', bleedingLevel: 'low' });
    expect(lo.pharmacological).toHaveLength(0);
  });
  it('出血高 => 药物项 deferred 且说明原因', () => {
    const r = recommendPrevention({ scale: 'caprini', vteLevel: 'high', bleedingLevel: 'high' });
    expect(r.pharmacological[0].deferred).toBe(true);
    expect(r.pharmacological[0].deferredReason).toContain('暂缓药物预防');
    // 机械仍建议
    expect(r.mechanical.some((m) => m.method === 'ipc')).toBe(true);
  });
});

describe('M13-A 预防不匹配提醒', () => {
  it('高危且无 confirmed/executed => mismatch', () => {
    const w = detectPreventionMismatch('high', [{ status: 'suggested' }, { status: 'suggested' }]);
    expect(w.mismatch).toBe(true);
  });
  it('极高危已有 confirmed => 不提醒', () => {
    const w = detectPreventionMismatch('very_high', [{ status: 'suggested' }, { status: 'confirmed' }]);
    expect(w.mismatch).toBe(false);
  });
  it('低危不提醒', () => {
    expect(detectPreventionMismatch('low', []).mismatch).toBe(false);
  });
});

describe('M13-A 质控指标 fractions', () => {
  it('聚合分子分母与百分比', () => {
    const rows = [
      { assessed: true, latestLevel: 'high' as const, hasPrevention: true, hospitalAcquiredVte: false },
      { assessed: true, latestLevel: 'very_high' as const, hasPrevention: false, hospitalAcquiredVte: true },
      { assessed: false, latestLevel: null, hasPrevention: false, hospitalAcquiredVte: false },
    ];
    const m = computeVteMetrics(rows, 10);
    // 评估率 = 2/10
    expect(m.fractions.assessmentRate).toEqual({ numerator: 2, denominator: 10 });
    expect(m.assessmentRate).toBe(20);
    // 高危预防实施率 = 1/2
    expect(m.fractions.highRiskPreventionRate).toEqual({ numerator: 1, denominator: 2 });
    expect(m.highRiskPreventionRate).toBe(50);
    // 医院获得性 VTE = 1/10
    expect(m.fractions.hospitalAcquiredVteRate).toEqual({ numerator: 1, denominator: 10 });
    expect(m.hospitalAcquiredVteRate).toBe(10);
  });
  it('分母为 0 => 0 不除零', () => {
    const m = computeVteMetrics([], 0);
    expect(m.assessmentRate).toBe(0);
    expect(m.highRiskPreventionRate).toBe(0);
  });
});

describe('M13-A 字典完整性（分值可追溯）', () => {
  it('字典内每项 key/label/points 一致', () => {
    for (const [key, f] of Object.entries(CAPRINI_FACTORS)) {
      expect(f.key).toBe(key);
      expect(f.points).toBeGreaterThan(0);
    }
    for (const [key, f] of Object.entries(PADUA_FACTORS)) {
      expect(f.key).toBe(key);
      expect(f.points).toBeGreaterThan(0);
    }
    for (const [key, f] of Object.entries(BLEEDING_FACTORS)) {
      expect(f.key).toBe(key);
    }
  });
});
