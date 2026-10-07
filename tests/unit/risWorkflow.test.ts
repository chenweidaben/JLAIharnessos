/**
 * 健澜科技 jlmedaios - RIS 规则引擎 单元测试（M11-B）
 *
 * 纯函数确定性测试：申请/预约/报告状态机转移、canTransition、
 * genStudyUid 确定性、审核职责分离、报告内容完整性。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  REQUEST_TRANSITIONS,
  APPOINTMENT_TRANSITIONS,
  REPORT_TRANSITIONS,
  canTransition,
  genStudyUid,
  assertSeparation,
  hasReportContent,
} from '../../src/medical-tools/imaging/risWorkflow.js';

describe('M11-B 申请状态机', () => {
  it('requested -> scheduled / cancelled 合法', () => {
    expect(canTransition(REQUEST_TRANSITIONS, 'requested', 'scheduled')).toBe(true);
    expect(canTransition(REQUEST_TRANSITIONS, 'requested', 'cancelled')).toBe(true);
  });
  it('scheduled -> arrived / cancelled 合法', () => {
    expect(canTransition(REQUEST_TRANSITIONS, 'scheduled', 'arrived')).toBe(true);
    expect(canTransition(REQUEST_TRANSITIONS, 'scheduled', 'cancelled')).toBe(true);
  });
  it('arrived -> in_progress 合法', () => {
    expect(canTransition(REQUEST_TRANSITIONS, 'arrived', 'in_progress')).toBe(true);
  });
  it('in_progress -> completed 合法', () => {
    expect(canTransition(REQUEST_TRANSITIONS, 'in_progress', 'completed')).toBe(true);
  });
  it('非法转移一律 false', () => {
    expect(canTransition(REQUEST_TRANSITIONS, 'requested', 'arrived')).toBe(false);
    expect(canTransition(REQUEST_TRANSITIONS, 'scheduled', 'completed')).toBe(false);
    expect(canTransition(REQUEST_TRANSITIONS, 'completed', 'requested')).toBe(false);
    expect(canTransition(REQUEST_TRANSITIONS, 'cancelled', 'scheduled')).toBe(false);
  });
});

describe('M11-B 预约状态机', () => {
  it('booked -> arrived / cancelled 合法', () => {
    expect(canTransition(APPOINTMENT_TRANSITIONS, 'booked', 'arrived')).toBe(true);
    expect(canTransition(APPOINTMENT_TRANSITIONS, 'booked', 'cancelled')).toBe(true);
  });
  it('arrived -> done 合法', () => {
    expect(canTransition(APPOINTMENT_TRANSITIONS, 'arrived', 'done')).toBe(true);
  });
  it('非法转移一律 false', () => {
    expect(canTransition(APPOINTMENT_TRANSITIONS, 'booked', 'done')).toBe(false);
    expect(canTransition(APPOINTMENT_TRANSITIONS, 'done', 'arrived')).toBe(false);
    expect(canTransition(APPOINTMENT_TRANSITIONS, 'cancelled', 'booked')).toBe(false);
  });
});

describe('M11-B 报告状态机', () => {
  it('draft -> reviewing 合法', () => {
    expect(canTransition(REPORT_TRANSITIONS, 'draft', 'reviewing')).toBe(true);
  });
  it('reviewing -> approved / returned 合法', () => {
    expect(canTransition(REPORT_TRANSITIONS, 'reviewing', 'approved')).toBe(true);
    expect(canTransition(REPORT_TRANSITIONS, 'reviewing', 'returned')).toBe(true);
  });
  it('returned -> reviewing 重新提交合法', () => {
    expect(canTransition(REPORT_TRANSITIONS, 'returned', 'reviewing')).toBe(true);
  });
  it('approved -> published 合法', () => {
    expect(canTransition(REPORT_TRANSITIONS, 'approved', 'published')).toBe(true);
  });
  it('非法转移一律 false', () => {
    expect(canTransition(REPORT_TRANSITIONS, 'draft', 'approved')).toBe(false);
    expect(canTransition(REPORT_TRANSITIONS, 'published', 'reviewing')).toBe(false);
    expect(canTransition(REPORT_TRANSITIONS, 'approved', 'draft')).toBe(false);
  });
});

describe('M11-B genStudyUid 确定性', () => {
  it('前缀 2.25. 且同 seed 恒等', () => {
    const a = genStudyUid('appt-123');
    const b = genStudyUid('appt-123');
    expect(a.startsWith('2.25.')).toBe(true);
    expect(a).toBe(b);
  });
  it('不同 seed 产出不同 UID', () => {
    expect(genStudyUid('appt-A')).not.toBe(genStudyUid('appt-B'));
  });
  it('空 seed 不抛错且仍合法前缀', () => {
    expect(genStudyUid('').startsWith('2.25.')).toBe(true);
  });
});

describe('M11-B 审核职责分离', () => {
  it('书写人与审核人相同 -> false（违反分离）', () => {
    expect(assertSeparation('user-a', 'user-a')).toBe(false);
  });
  it('书写人与审核人不同 -> true（通过）', () => {
    expect(assertSeparation('user-a', 'user-b')).toBe(true);
  });
});

describe('M11-B 报告内容完整性', () => {
  it('仅有 findings -> true', () => {
    expect(hasReportContent({ findings: '右肺结节', impression: null })).toBe(true);
  });
  it('仅有 impression -> true', () => {
    expect(hasReportContent({ findings: '', impression: '考虑良性' })).toBe(true);
  });
  it('两者均为空白 -> false', () => {
    expect(hasReportContent({ findings: '   ', impression: '' })).toBe(false);
  });
  it('两者均为 null -> false', () => {
    expect(hasReportContent({ findings: null, impression: null })).toBe(false);
  });
  it('仅空白符 trim 后判空', () => {
    expect(hasReportContent({ findings: '\n\t', impression: null })).toBe(false);
  });
});
