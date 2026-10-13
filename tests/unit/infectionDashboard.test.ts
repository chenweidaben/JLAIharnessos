/**
 * 健澜科技 jlmedaios - 院感看板纯函数测试（M76-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  departmentRanking, deviceRate, handHygieneRate, isAlert, ssiRate,
} from '../../src/medical-tools/nursing/infectionDashboard.js';

describe('handHygieneRate', () => {
  it('计算百分比', () => {
    expect(handHygieneRate(100, 85)).toBe(85);
  });
  it('零观察 -> 0', () => {
    expect(handHygieneRate(0, 0)).toBe(0);
  });
});

describe('deviceRate', () => {
  it('每千日率', () => {
    expect(deviceRate(2, 400)).toBe(5);
  });
});

describe('ssiRate', () => {
  it('SSI 百分比', () => {
    expect(ssiRate(1, 100)).toBe(1);
  });
});

describe('departmentRanking', () => {
  it('降序', () => {
    const r = departmentRanking([
      { department: 'A', infectionRate: 2 },
      { department: 'B', infectionRate: 5 },
    ]);
    expect(r[0].department).toBe('B');
  });
});

describe('isAlert', () => {
  it('超阈值 true', () => {
    expect(isAlert(6, 5)).toBe(true);
  });
  it('未超 false', () => {
    expect(isAlert(4, 5)).toBe(false);
  });
});
