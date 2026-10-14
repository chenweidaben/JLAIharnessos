/**
 * 健澜科技 jlmedaios - 质控整改闭环看板 nextStatus 状态机单测（215）
 *
 * 覆盖：open→fixed→reviewed→closed 正向流转、closed 终态幂等、非法状态抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { nextStatus, QcRectificationError } from '../../src/bff/aggregators/qcRectificationAggregator';

describe('215 nextStatus 状态机', () => {
  it('open → fixed', () => {
    expect(nextStatus('open')).toBe('fixed');
  });

  it('fixed → reviewed', () => {
    expect(nextStatus('fixed')).toBe('reviewed');
  });

  it('reviewed → closed', () => {
    expect(nextStatus('reviewed')).toBe('closed');
  });

  it('closed 为终态，幂等返回 closed', () => {
    expect(nextStatus('closed')).toBe('closed');
  });

  it('正向链路 open→fixed→reviewed→closed 逐步推进', () => {
    expect(nextStatus(nextStatus(nextStatus('open')))).toBe('closed');
  });

  it('非法/未知状态抛 QcRectificationError', () => {
    expect(() => nextStatus('pending')).toThrow(QcRectificationError);
    expect(() => nextStatus('')).toThrow(/未知整改状态/);
    // @ts-expect-error 故意传入非法值
    expect(() => nextStatus(undefined)).toThrow();
  });
});
