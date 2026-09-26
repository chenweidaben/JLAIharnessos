/**
 * 健澜科技 jlmedaios - 急诊状态机单测（M1-B1）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { describe, expect, it } from 'bun:test';

import {
  allowedNext,
  assertTransition,
  canTransition,
  isTerminal,
  StateTransitionError,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  type EmergencyStatus,
} from '@/emergency/stateMachine.js';

describe('急诊状态机', () => {
  it('每个状态都有中文标签', () => {
    const all: EmergencyStatus[] = [
      'waiting_triage', 'triaged', 'in_treatment', 'resuscitation',
      'observation', 'admitted', 'transferred', 'discharged', 'deceased',
    ];
    for (const s of all) expect(STATUS_LABELS[s]).toBeTruthy();
  });

  it('待分诊只能转已分诊', () => {
    expect(canTransition('waiting_triage', 'triaged')).toBe(true);
    expect(canTransition('waiting_triage', 'in_treatment')).toBe(false);
    expect(canTransition('waiting_triage', 'resuscitation')).toBe(false);
  });

  it('已分诊可进入救治/抢救/留观', () => {
    const expected: EmergencyStatus[] = ['in_treatment', 'observation', 'resuscitation'];
    expect(allowedNext('triaged').sort()).toEqual(expected.sort());
  });

  it('抢救与留观可相互转换，并可进入各终态', () => {
    expect(canTransition('resuscitation', 'observation')).toBe(true);
    expect(canTransition('observation', 'resuscitation')).toBe(true);
    for (const t of ['admitted', 'transferred', 'discharged', 'deceased'] as EmergencyStatus[]) {
      expect(canTransition('resuscitation', t)).toBe(true);
      expect(canTransition('observation', t)).toBe(true);
    }
  });

  it('终态集合与 isTerminal 判定一致', () => {
    expect(TERMINAL_STATUSES.size).toBe(4);
    expect(isTerminal('admitted')).toBe(true);
    expect(isTerminal('deceased')).toBe(true);
    expect(isTerminal('triaged')).toBe(false);
    expect(isTerminal('observation')).toBe(false);
  });

  it('终态不可再流转', () => {
    for (const t of TERMINAL_STATUSES) {
      expect(allowedNext(t)).toEqual([]);
      expect(canTransition(t, 'triaged')).toBe(false);
    }
  });

  it('同状态流转被拒绝', () => {
    expect(canTransition('triaged', 'triaged')).toBe(false);
  });

  it('assertTransition 合法流转不抛错', () => {
    expect(() => assertTransition('waiting_triage', 'triaged')).not.toThrow();
    expect(() => assertTransition('triaged', 'resuscitation')).not.toThrow();
  });

  it('assertTransition 非法流转抛出 StateTransitionError', () => {
    expect(() => assertTransition('waiting_triage', 'admitted')).toThrow(StateTransitionError);
    expect(() => assertTransition('admitted', 'triaged')).toThrow(/终态/);
  });
});
