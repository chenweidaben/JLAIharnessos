/**
 * 健澜科技 jlmedaios - 康复治疗状态机/疗效引擎测试（M51-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { efficacyScore, isEffective, needsReReview, nextStatus } from '../../src/medical-tools/nursing/rehabTreatment.js';

describe('nextStatus 状态机', () => {
  it('prescribed --sign--> signed', () => {
    expect(nextStatus('prescribed', 'sign')).toBe('signed');
  });
  it('signed --complete--> completed', () => {
    expect(nextStatus('signed', 'complete')).toBe('completed');
  });
  it('signed --miss--> missed', () => {
    expect(nextStatus('signed', 'miss')).toBe('missed');
  });
  it('prescribed --cancel--> cancelled', () => {
    expect(nextStatus('prescribed', 'cancel')).toBe('cancelled');
  });
  it('completed 为终态，任意事件 null', () => {
    expect(nextStatus('completed', 'sign')).toBeNull();
    expect(nextStatus('completed', 'complete')).toBeNull();
  });
  it('prescribed 不能直接 complete', () => {
    expect(nextStatus('prescribed', 'complete')).toBeNull();
  });
});

describe('疗效映射', () => {
  it('efficacyScore excellent=4 poor=1', () => {
    expect(efficacyScore('excellent')).toBe(4);
    expect(efficacyScore('good')).toBe(3);
    expect(efficacyScore('fair')).toBe(2);
    expect(efficacyScore('poor')).toBe(1);
    expect(efficacyScore(null)).toBe(0);
  });
  it('isEffective: excellent/good 有效', () => {
    expect(isEffective('excellent')).toBe(true);
    expect(isEffective('good')).toBe(true);
    expect(isEffective('fair')).toBe(false);
    expect(isEffective('poor')).toBe(false);
  });
  it('needsReReview: fair/poor 触发复评', () => {
    expect(needsReReview('fair')).toBe(true);
    expect(needsReReview('poor')).toBe(true);
    expect(needsReReview('excellent')).toBe(false);
    expect(needsReReview('good')).toBe(false);
  });
});
