/**
 * 健澜科技 jlmedaios - 续方纯函数单测（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { canRenew, nextStatus } from '../../src/medical-tools/internet/renewalFlow';

describe('renewalFlow pure', () => {
  it('续方资格', () => {
    expect(canRenew({ sessionStatus: 'completed', hasPriorRx: true })).toBe(true);
    expect(canRenew({ sessionStatus: 'in_progress', hasPriorRx: true })).toBe(false);
    expect(canRenew({ sessionStatus: 'completed', hasPriorRx: false })).toBe(false);
  });
  it('状态机', () => {
    expect(nextStatus('consult_completed', 'prescribe')).toBe('approved');
    expect(nextStatus('approved', 'pay')).toBe('paid');
    expect(nextStatus('paid', 'dispense')).toBe('ready_dispense');
    expect(nextStatus('pending_review', 'pay')).toBeNull();
  });
});
