/**
 * 健澜科技 jlmedaios - 配药任务纯函数单测（M21-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { nextTaskStatus, shouldCreateTask } from '../../src/medical-tools/internet/dispenseTask';

describe('dispenseTask pure', () => {
  it('应建任务', () => {
    expect(shouldCreateTask('paid', 'approved')).toBe(true);
    expect(shouldCreateTask('pending', 'approved')).toBe(false);
  });
  it('任务状态机', () => {
    expect(nextTaskStatus('pending', 'complete')).toBe('completed');
    expect(nextTaskStatus('completed', 'complete')).toBeNull();
    expect(nextTaskStatus('pending', 'cancel')).toBe('cancelled');
  });
});
