/**
 * 健澜科技 jlmedaios - 手术核查表纯函数测试（M82-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  isPassed, missingItems, signinItems, signoutItems, timeoutItems,
} from '../../src/medical-tools/nursing/surgicalChecklist.js';

describe('signinItems', () => {
  it('返回三项', () => {
    expect(signinItems({ patient: true, allergy: false, blood: true }))
      .toEqual({ patient: true, allergy: false, blood: true });
  });
});

describe('timeoutItems', () => {
  it('返回三项', () => {
    expect(timeoutItems({ site: true, procedure: true, antibiotic: false }))
      .toEqual({ site: true, procedure: true, antibiotic: false });
  });
});

describe('signoutItems', () => {
  it('返回两项', () => {
    expect(signoutItems({ instruments: true, patientTransfer: false }))
      .toEqual({ instruments: true, patientTransfer: false });
  });
});

const full = {
  signinComplete: true, timeoutComplete: true, signoutComplete: true,
  patientConfirmed: true, siteMarked: true, procedureConfirmed: true,
  allergyConfirmed: true, antibioticGiven: true, bloodPrepared: true, instrumentsCounted: true,
};

describe('isPassed', () => {
  it('全 true → passed', () => {
    expect(isPassed(full)).toBe(true);
  });
  it('缺项 → false', () => {
    expect(isPassed({ ...full, antibioticGiven: false })).toBe(false);
  });
});

describe('missingItems', () => {
  it('列出缺项', () => {
    expect(missingItems({ ...full, antibioticGiven: false, bloodPrepared: false }))
      .toEqual(['antibiotic_given', 'blood_prepared']);
  });
  it('全项 → 空', () => {
    expect(missingItems(full)).toEqual([]);
  });
});
