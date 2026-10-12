/**
 * 健澜科技 jlmedaios - 改进任务状态机单测（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { canTransition, isOverdue } from '../../src/medical-tools/operations/improvementTask';

describe('improvement task state machine', () => {
  it('合法迁移', () => {
    expect(canTransition('open', 'accepted')).toBe(true);
    expect(canTransition('in_progress', 'resolved')).toBe(true);
    expect(canTransition('resolved', 'verified')).toBe(true);
    expect(canTransition('verified', 'closed')).toBe(true);
  });
  it('非法迁移', () => {
    expect(canTransition('open', 'closed')).toBe(false);
    expect(canTransition('resolved', 'open')).toBe(false);
  });
  it('任意→rejected', () => {
    expect(canTransition('open', 'rejected')).toBe(true);
    expect(canTransition('in_progress', 'rejected')).toBe(true);
  });
  it('到期', () => {
    expect(isOverdue('2000-01-01')).toBe(true);
    expect(isOverdue(null)).toBe(false);
  });
});
