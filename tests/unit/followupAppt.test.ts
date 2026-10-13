/**
 * 健澜科技 jlmedaios - 复诊号源推荐纯函数测试（M62-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { isConflict, pickSuggestedSchedule, type SlotOption } from '../../src/medical-tools/nursing/followupAppt.js';

const s = (scheduleId: string, appointmentDate: string, remaining: number): SlotOption => ({
  scheduleId, appointmentDate, department: '内分泌科', remaining,
});

describe('pickSuggestedSchedule', () => {
  it('优先最近工作日有余量', () => {
    const opts = [
      s('a', '2026-10-17', 5), // 周六
      s('b', '2026-10-15', 3), // 周四
    ];
    expect(pickSuggestedSchedule(opts, '2026-10-14')?.scheduleId).toBe('b');
  });
  it('无余量返回 null', () => {
    expect(pickSuggestedSchedule([s('a', '2026-10-15', 0)], '2026-10-14')).toBeNull();
  });
});

describe('isConflict', () => {
  it('同日期冲突', () => { expect(isConflict('2026-11-01', '2026-11-01')).toBe(true); });
  it('不同日期不冲突', () => { expect(isConflict('2026-11-01', '2026-11-05')).toBe(false); });
  it('无既有不冲突', () => { expect(isConflict(null, '2026-11-01')).toBe(false); });
});
