/**
 * 健澜科技 jlmedaios - 患者端门户纯函数测试（M80-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { highlight, pendingCount } from '../../src/medical-tools/nursing/patientPortal.js';

describe('pendingCount', () => {
  it('汇总待办计数', () => {
    expect(pendingCount({
      bookedAppts: 2, unreadReports: 1, unreadNotifs: 3,
      depositDue: 0, followupDue: 1, surveyDue: 2,
    })).toEqual({
      upcomingAppt: 2, unreadReports: 1, unreadNotifs: 3,
      depositDue: 0, followupDue: 1, surveyDue: 2,
    });
  });
});

describe('highlight', () => {
  it('取最紧急项', () => {
    const h = highlight([
      { key: 'a', urgent: false }, { key: 'b', urgent: true }, { key: 'c', urgent: false },
    ]);
    expect(h?.key).toBe('b');
  });
  it('空数组返回 null', () => {
    expect(highlight([])).toBeNull();
  });
  it('无紧急项取首项', () => {
    const h = highlight([{ key: 'a', urgent: false }]);
    expect(h?.key).toBe('a');
  });
});
