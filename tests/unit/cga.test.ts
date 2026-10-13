/**
 * 健澜科技 jlmedaios - CGA 纯函数测试（M56-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { flags, needsIntervention, riskLevel } from '../../src/medical-tools/nursing/cga.js';

describe('cga riskLevel', () => {
  it('ADL<60 -> high', () => {
    expect(riskLevel({ adlScore: 50, iadlScore: 20, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2 })).toBe('high');
  });
  it('MMSE<24 -> high', () => {
    expect(riskLevel({ adlScore: 90, iadlScore: 25, mmseScore: 22, fallRisk: false, mnaScore: 13, gdsScore: 2 })).toBe('high');
  });
  it('fall_risk -> high', () => {
    expect(riskLevel({ adlScore: 90, iadlScore: 25, mmseScore: 28, fallRisk: true, mnaScore: 13, gdsScore: 2 })).toBe('high');
  });
  it('MNA<12 -> high', () => {
    expect(riskLevel({ adlScore: 90, iadlScore: 25, mmseScore: 28, fallRisk: false, mnaScore: 10, gdsScore: 2 })).toBe('high');
  });
  it('GDS>=5 -> high', () => {
    expect(riskLevel({ adlScore: 90, iadlScore: 25, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 6 })).toBe('high');
  });
  it('ADL<80 且无高危 -> moderate', () => {
    expect(riskLevel({ adlScore: 70, iadlScore: 20, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2 })).toBe('moderate');
  });
  it('完全自理 -> low', () => {
    expect(riskLevel({ adlScore: 100, iadlScore: 28, mmseScore: 30, fallRisk: false, mnaScore: 14, gdsScore: 0 })).toBe('low');
  });
});

describe('cga flags / needsIntervention', () => {
  it('flags 命中各维', () => {
    const fl = flags({ adlScore: 50, iadlScore: 5, mmseScore: 22, fallRisk: true, mnaScore: 10, gdsScore: 6 });
    expect(fl).toContain('adl_dependent');
    expect(fl).toContain('cognitive_impairment');
    expect(fl).toContain('fall_risk');
    expect(fl).toContain('malnutrition');
    expect(fl).toContain('depression_screen');
  });
  it('high 触发干预 / low 不触发', () => {
    expect(needsIntervention({ adlScore: 50, iadlScore: 20, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2 })).toBe(true);
    expect(needsIntervention({ adlScore: 100, iadlScore: 28, mmseScore: 30, fallRisk: false, mnaScore: 14, gdsScore: 0 })).toBe(false);
  });
});
