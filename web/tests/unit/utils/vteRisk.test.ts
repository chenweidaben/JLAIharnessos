/**
 * 健澜科技 jlmedaios - VTE 评分纯函数引擎单测（M13-A / M13A_TEST）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 纯函数、确定性、无 I/O：覆盖 Caprini/Padua 各分值累加、分层边界、出血、预防建议。
 */
import { describe, it, expect } from 'vitest';
import {
  assessBleeding,
  BLEEDING_FACTORS,
  CAPRINI_FACTORS,
  capriniLevel,
  PADUA_FACTORS,
  paduaLevel,
  recommendPrevention,
  scoreCaprini,
  scorePadua,
} from '@/utils/vteRisk';

describe('M13A_TEST Caprini 评分', () => {
  it('空因素 => 0 分低危', () => {
    const r = scoreCaprini([]);
    expect(r.score).toBe(0);
    expect(r.factors).toEqual([]);
    expect(capriniLevel(0)).toBe('low');
  });

  it('累加所选因素分值，输出明细', () => {
    const r = scoreCaprini(['age_61_74', 'major_surgery_gt45min']);
    expect(r.score).toBe(CAPRINI_FACTORS.age_61_74.points + CAPRINI_FACTORS.major_surgery_gt45min.points);
    expect(r.factors).toHaveLength(2);
  });

  it('未知 key 忽略，不贡献分值', () => {
    const r = scoreCaprini(['not_a_factor', 'age_41_60']);
    expect(r.score).toBe(CAPRINI_FACTORS.age_41_60.points);
    expect(r.factors.map((f) => f.key)).toEqual(['age_41_60']);
  });

  it('分层边界严格：0-1 低 / 2 中 / 3-4 高 / ≥5 极高', () => {
    expect(capriniLevel(0)).toBe('low');
    expect(capriniLevel(1)).toBe('low');
    expect(capriniLevel(2)).toBe('medium');
    expect(capriniLevel(3)).toBe('high');
    expect(capriniLevel(4)).toBe('high');
    expect(capriniLevel(5)).toBe('very_high');
    expect(capriniLevel(9)).toBe('very_high');
  });
});

describe('M13A_TEST Padua 评分', () => {
  it('空 => 0 分低危', () => {
    const r = scorePadua([]);
    expect(r.score).toBe(0);
    expect(paduaLevel(0)).toBe('low');
  });

  it('累加活动性肿瘤(3)+卧床(3)=6 分高危', () => {
    const r = scorePadua(['active_cancer', 'bedridden_ge3d']);
    expect(r.score).toBe(6);
    expect(r.factors).toHaveLength(2);
    expect(paduaLevel(6)).toBe('high');
  });

  it('分层边界：<4 低危 / ≥4 高危', () => {
    expect(paduaLevel(3)).toBe('low');
    expect(paduaLevel(4)).toBe('high');
    expect(paduaLevel(1)).toBe('low');
  });

  it('未知 key 忽略', () => {
    const r = scorePadua(['ghost', 'age_ge70']);
    expect(r.score).toBe(PADUA_FACTORS.age_ge70.points);
  });
});

describe('M13A_TEST 出血风险', () => {
  it('无因素 => 低', () => {
    expect(assessBleeding([])).toEqual({ level: 'low', factors: [] });
  });

  it('命中任一因素 => 高，且返回明细', () => {
    const r = assessBleeding(['active_bleeding', 'ghost']);
    expect(r.level).toBe('high');
    expect(r.factors).toEqual([{ key: 'active_bleeding', label: BLEEDING_FACTORS.active_bleeding }]);
  });
});

describe('M13A_TEST 预防建议', () => {
  it('低危 => 仅早期活动', () => {
    const adv = recommendPrevention({ scale: 'caprini', vteLevel: 'low', bleedingLevel: 'low' });
    expect(adv).toHaveLength(1);
    expect(adv[0].method).toBe('early_mobilization');
  });

  it('Caprini 极高危 + 低出血 => 机械(IPC)+药物(低分子肝素)', () => {
    const adv = recommendPrevention({ scale: 'caprini', vteLevel: 'very_high', bleedingLevel: 'low' });
    expect(adv.some((a) => a.category === 'mechanical' && a.method === 'ipc')).toBe(true);
    const drug = adv.find((a) => a.category === 'pharmacological');
    expect(drug?.method).toBe('lmwh');
    expect(drug?.deferred).toBeUndefined();
  });

  it('Caprini 中危 => 机械 + 药物(择一)', () => {
    const adv = recommendPrevention({ scale: 'caprini', vteLevel: 'medium', bleedingLevel: 'low' });
    expect(adv.some((a) => a.method === 'ipc')).toBe(true);
    expect(adv.some((a) => a.method === 'lmwh')).toBe(true);
  });

  it('高出血风险 => 药物 deferred 说明', () => {
    const adv = recommendPrevention({ scale: 'padua', vteLevel: 'high', bleedingLevel: 'high' });
    const drug = adv.find((a) => a.category === 'pharmacological');
    expect(drug?.deferred).toBeTruthy();
  });

  it('Padua 高危 + 低出血 => 药物建议', () => {
    const adv = recommendPrevention({ scale: 'padua', vteLevel: 'high', bleedingLevel: 'low' });
    expect(adv.some((a) => a.method === 'lmwh')).toBe(true);
  });
});
