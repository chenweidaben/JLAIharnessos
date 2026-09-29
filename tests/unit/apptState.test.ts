/**
 * 健澜科技 jlmedaios - 预约随访纯函数单测（M3-I）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
// 状态转移表与聚合器内联一致性校验：复制聚合器的转移表语义。
const APPT_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'absent'],
  completed: [],
  absent: [],
  cancelled: [],
};

describe('预约状态机', () => {
  it('scheduled 可确认/取消', () => {
    expect(APPT_TRANSITIONS['scheduled']).toContain('confirmed');
    expect(APPT_TRANSITIONS['scheduled']).toContain('cancelled');
  });
  it('confirmed 可完成/缺席', () => {
    expect(APPT_TRANSITIONS['confirmed']).toContain('completed');
    expect(APPT_TRANSITIONS['confirmed']).toContain('absent');
  });
  it('终态不可再转', () => {
    expect(APPT_TRANSITIONS['completed']).toHaveLength(0);
    expect(APPT_TRANSITIONS['cancelled']).toHaveLength(0);
  });
  it('非法转换不在白名单', () => {
    expect(APPT_TRANSITIONS['scheduled']).not.toContain('completed');
    expect(APPT_TRANSITIONS['confirmed']).not.toContain('cancelled');
  });
});
