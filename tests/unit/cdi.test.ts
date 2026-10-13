/**
 * 健澜科技 jlmedaios - CDI 纯函数测试（M70-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { checkAllergy, checkDose, checkInteraction, worseSeverity } from '../../src/medical-tools/nursing/cdi.js';

describe('worseSeverity', () => {
  it('block > warning', () => {
    expect(worseSeverity('warning', 'block')).toBe('block');
  });
  it('info < warning', () => {
    expect(worseSeverity('info', 'warning')).toBe('warning');
  });
});

describe('checkInteraction', () => {
  it('warfarin + aspirin -> block', () => {
    expect(checkInteraction('warfarin', ['aspirin'])).toBe('block');
  });
  it('无相互作用 -> info', () => {
    expect(checkInteraction('metformin', ['aspirin'])).toBe('info');
  });
});

describe('checkAllergy', () => {
  it('命中过敏史 -> block', () => {
    expect(checkAllergy('penicillin', ['penicillin'])).toBe('block');
  });
  it('无过敏 -> info', () => {
    expect(checkAllergy('ibuprofen', ['aspirin'])).toBe('info');
  });
});

describe('checkDose', () => {
  it('>10 mg/kg -> block', () => {
    expect(checkDose('drug', 600, 50)).toBe('block');
  });
  it('>5 mg/kg -> warning', () => {
    expect(checkDose('drug', 300, 50)).toBe('warning');
  });
  it('<=5 mg/kg -> info', () => {
    expect(checkDose('drug', 100, 50)).toBe('info');
  });
});
