/**
 * 单元测试 - 咨询会话状态机（契约 §2）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  assertTransition,
  canTransition,
  isTerminalStatus,
  THREAD_TRANSITIONS,
} from '../../../src/core/agent/consult/stateMachine';

describe('stateMachine 状态机', () => {
  it('合法转移应返回 true', () => {
    expect(canTransition('idle', 'collecting')).toBe(true);
    expect(canTransition('collecting', 'clarifying')).toBe(true);
    expect(canTransition('collecting', 'drafting')).toBe(true);
    expect(canTransition('drafting', 'review_pending')).toBe(true);
    expect(canTransition('clarifying', 'escalated')).toBe(true);
    expect(canTransition('escalated', 'closed')).toBe(true);
  });

  it('非法转移应返回 false', () => {
    expect(canTransition('idle', 'review_pending')).toBe(false);
    expect(canTransition('idle', 'drafting')).toBe(false);
    expect(canTransition('closed', 'collecting')).toBe(false);
    expect(canTransition('aborted', 'closed')).toBe(false);
    expect(canTransition('escalated', 'drafting')).toBe(false);
    expect(canTransition('review_pending', 'drafting')).toBe(true);
  });

  it('assertTransition 合法转移不抛错，非法转移显式抛错', () => {
    expect(() => assertTransition('collecting', 'drafting')).not.toThrow();
    expect(() => assertTransition('drafting', 'review_pending')).not.toThrow();
    expect(() => assertTransition('closed', 'collecting')).toThrow(/非法状态转移/);
    expect(() => assertTransition('escalated', 'drafting')).toThrow(/非法状态转移/);
  });

  it('closed / aborted 为终态且无出边', () => {
    expect(isTerminalStatus('closed')).toBe(true);
    expect(isTerminalStatus('aborted')).toBe(true);
    expect(isTerminalStatus('collecting')).toBe(false);
    expect(THREAD_TRANSITIONS.closed).toEqual([]);
    expect(THREAD_TRANSITIONS.aborted).toEqual([]);
  });

  it('急症旁路可从采集 / 澄清 / 草稿状态进入 escalated（冻结转移表）', () => {
    for (const from of ['collecting', 'clarifying', 'drafting'] as const) {
      expect(canTransition(from, 'escalated')).toBe(true);
    }
    expect(canTransition('review_pending', 'escalated')).toBe(false);
  });
});
