/**
 * 健澜科技 jlmedaios - 药事看板纯函数测试（M77-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  antibioticRate, departmentRanking, dddsPer100, isAlert, prophylaxisRate, specialClassRate,
} from '../../src/medical-tools/nursing/amDashboard.js';

describe('dddsPer100', () => {
  it('每百人天', () => {
    expect(dddsPer100(40, 1000)).toBe(4);
  });
  it('零床日 -> 0', () => {
    expect(dddsPer100(100, 0)).toBe(0);
  });
});

describe('antibioticRate', () => {
  it('使用率', () => {
    expect(antibioticRate(20, 100)).toBe(20);
  });
});

describe('specialClassRate', () => {
  it('特殊级占比', () => {
    expect(specialClassRate(5, 50)).toBe(10);
  });
});

describe('prophylaxisRate', () => {
  it('预防合理率', () => {
    expect(prophylaxisRate(9, 10)).toBe(90);
  });
});

describe('departmentRanking', () => {
  it('DDDs 降序', () => {
    const r = departmentRanking([
      { department: 'A', ddds: 30 }, { department: 'B', ddds: 80 },
    ]);
    expect(r[0].department).toBe('B');
  });
});

describe('isAlert', () => {
  it('超阈值 true', () => {
    expect(isAlert(5, 4)).toBe(true);
  });
  it('未超 false', () => {
    expect(isAlert(3, 4)).toBe(false);
  });
});
