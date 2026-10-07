/**
 * 健澜科技 jlmedaios - LIS 规则引擎 单元测试（M11-A）
 *
 * 纯函数确定性测试：标本/报告状态机转移、canTransition、
 * evaluateItem 参考范围/异常/危急值判定、审核职责分离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  SPECIMEN_TRANSITIONS,
  REPORT_TRANSITIONS,
  canTransition,
  evaluateItem,
  assertSeparation,
} from '../../src/medical-tools/lab/lisWorkflow.js';

describe('M11-A 标本状态机', () => {
  it('registered -> collected 合法', () => {
    expect(canTransition(SPECIMEN_TRANSITIONS, 'registered', 'collected')).toBe(true);
  });
  it('collected -> received 合法', () => {
    expect(canTransition(SPECIMEN_TRANSITIONS, 'collected', 'received')).toBe(true);
  });
  it('registered / collected 均可拒收 rejected', () => {
    expect(canTransition(SPECIMEN_TRANSITIONS, 'registered', 'rejected')).toBe(true);
    expect(canTransition(SPECIMEN_TRANSITIONS, 'collected', 'rejected')).toBe(true);
  });
  it('received -> tested 合法', () => {
    expect(canTransition(SPECIMEN_TRANSITIONS, 'received', 'tested')).toBe(true);
  });
  it('非法转移一律 false', () => {
    expect(canTransition(SPECIMEN_TRANSITIONS, 'registered', 'received')).toBe(false);
    expect(canTransition(SPECIMEN_TRANSITIONS, 'received', 'collected')).toBe(false);
    expect(canTransition(SPECIMEN_TRANSITIONS, 'tested', 'received')).toBe(false);
    expect(canTransition(SPECIMEN_TRANSITIONS, 'rejected', 'collected')).toBe(false);
  });
});

describe('M11-A 报告状态机', () => {
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

describe('M11-A evaluateItem 判定顺序', () => {
  const item = {
    refLow: 3.5, refHigh: 5.3,
    critLow: 2.8, critHigh: 6.5,
  };

  it('低于危急下限 -> LL 危急', () => {
    const r = evaluateItem(item, '2.5');
    expect(r.numericValue).toBe(2.5);
    expect(r.abnormalFlag).toBe('LL');
    expect(r.isCritical).toBe(true);
  });
  it('高于危急上限 -> HH 危急', () => {
    const r = evaluateItem(item, '7.0');
    expect(r.numericValue).toBe(7.0);
    expect(r.abnormalFlag).toBe('HH');
    expect(r.isCritical).toBe(true);
  });
  it('低于参考下限但未达危急 -> L', () => {
    const r = evaluateItem(item, '3.0');
    expect(r.abnormalFlag).toBe('L');
    expect(r.isCritical).toBe(false);
  });
  it('高于参考上限但未达危急 -> H', () => {
    const r = evaluateItem(item, '6.0');
    expect(r.abnormalFlag).toBe('H');
    expect(r.isCritical).toBe(false);
  });
  it('参考范围内 -> N', () => {
    const r = evaluateItem(item, '4.5');
    expect(r.abnormalFlag).toBe('N');
    expect(r.isCritical).toBe(false);
  });
  it('边界等于危急值不算危急（严格不等号）', () => {
    // 2.8 等于 critLow，不触发 LL；2.8 < refLow 3.5 -> L
    const r = evaluateItem(item, '2.8');
    expect(r.abnormalFlag).toBe('L');
    expect(r.isCritical).toBe(false);
  });
  it('危急判定优先于异常判定', () => {
    // 6.6 既 > refHigh 5.3 又 > critHigh 6.5，应 HH 而非 H
    const r = evaluateItem(item, '6.6');
    expect(r.abnormalFlag).toBe('HH');
    expect(r.isCritical).toBe(true);
  });
  it('文本结果：numericValue=null、flag=N、不危急，value 原样', () => {
    const r = evaluateItem({ refLow: 0, refHigh: 10, critLow: null, critHigh: null }, '凝集');
    expect(r.numericValue).toBeNull();
    expect(r.abnormalFlag).toBe('N');
    expect(r.isCritical).toBe(false);
    expect(r.value).toBe('凝集');
  });
  it('空串视为非数值', () => {
    const r = evaluateItem(item, '   ');
    expect(r.numericValue).toBeNull();
    expect(r.abnormalFlag).toBe('N');
    expect(r.isCritical).toBe(false);
  });
  it('无危急阈值项目：ALT 超高不危急只报 H', () => {
    const alt = { refLow: 9, refHigh: 50, critLow: null, critHigh: null };
    expect(evaluateItem(alt, '200').abnormalFlag).toBe('H');
    expect(evaluateItem(alt, '200').isCritical).toBe(false);
    expect(evaluateItem(alt, '20').abnormalFlag).toBe('N');
  });
  it('只配 critHigh 的项目（cTnI）：0.6 危急 HH', () => {
    const ctni = { refLow: 0, refHigh: 0.04, critLow: null, critHigh: 0.5 };
    const r = evaluateItem(ctni, '0.6');
    expect(r.abnormalFlag).toBe('HH');
    expect(r.isCritical).toBe(true);
    expect(evaluateItem(ctni, '0.02').abnormalFlag).toBe('N');
  });
});

describe('M11-A 审核职责分离', () => {
  it('录入人与审核人相同 -> false（违反分离）', () => {
    expect(assertSeparation('user-a', 'user-a')).toBe(false);
  });
  it('录入人与审核人不同 -> true（通过）', () => {
    expect(assertSeparation('user-a', 'user-b')).toBe(true);
  });
});
