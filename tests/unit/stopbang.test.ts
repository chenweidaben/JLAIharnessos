/**
 * 健澜科技 jlmedaios - STOP-BANG 纯函数测试（M59-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { calcScore, needsSleepStudy, riskLevel, type StopBangAnswers } from '../../src/medical-tools/nursing/stopbang.js';

const allFalse: StopBangAnswers = {
  sSnoring: false, tTired: false, oObserved: false, pPressure: false,
  bBmi: false, aAge: false, nNeck: false, gGender: false,
};

describe('stopbang calcScore', () => {
  it('全否 0 分', () => { expect(calcScore(allFalse)).toBe(0); });
  it('全是 8 分', () => {
    const allTrue: StopBangAnswers = {
      sSnoring: true, tTired: true, oObserved: true, pPressure: true,
      bBmi: true, aAge: true, nNeck: true, gGender: true,
    };
    expect(calcScore(allTrue)).toBe(8);
  });
  it('3 项 true -> 3', () => {
    expect(calcScore({ ...allFalse, sSnoring: true, bBmi: true, aAge: true })).toBe(3);
  });
});

describe('stopbang riskLevel / needsSleepStudy', () => {
  it('>=3 high', () => { expect(riskLevel(3)).toBe('high'); expect(riskLevel(5)).toBe('high'); });
  it('<3 low', () => { expect(riskLevel(2)).toBe('low'); expect(riskLevel(0)).toBe('low'); });
  it('>=3 需睡眠监测', () => { expect(needsSleepStudy(3)).toBe(true); });
  it('<3 不需', () => { expect(needsSleepStudy(2)).toBe(false); });
});
