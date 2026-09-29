/**
 * 健澜科技 jlmedaios - 手术麻醉纯函数单测（M3-H）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import { computePrecheckComplete, canDischarge } from '../../src/bff/aggregators/surgeryAggregator';

describe('computePrecheckComplete', () => {
  it('六项全 true 才完整', () => {
    expect(computePrecheckComplete({
      patient: true, procedure: true, anesthesiaMethod: true,
      surgeon: true, antibiotic: true, skinTest: true,
    })).toBe(true);
  });
  it('缺一项即不完整', () => {
    expect(computePrecheckComplete({
      patient: true, procedure: true, anesthesiaMethod: true,
      surgeon: true, antibiotic: true, skinTest: false,
    })).toBe(false);
  });
  it('空对象不完整', () => {
    expect(computePrecheckComplete({})).toBe(false);
  });
});

describe('canDischarge', () => {
  const base = { surgeonSignedAt: '2026-09-29', anesthetistSignedAt: '2026-09-29' } as never;
  it('双签 + Aldrete>=9 可离室', () => {
    expect(canDischarge(base, 9)).toBe(true);
    expect(canDischarge(base, 10)).toBe(true);
  });
  it('Aldrete<9 不可离室', () => {
    expect(canDischarge(base, 8)).toBe(false);
  });
  it('缺麻醉签不可离室', () => {
    const one = { surgeonSignedAt: '2026-09-29', anesthetistSignedAt: null } as never;
    expect(canDischarge(one, 10)).toBe(false);
  });
});
