/**
 * 健澜科技 jlmedaios - M152-C 智能排班纯函数单测
 *
 * 覆盖：
 *  - optimizeSchedule：一周（2026-01-05 ~ 2026-01-11）公平排班，硬约束全部满足；
 *  - 夜班均衡：任意两人本周夜班数 max - min ≤ 1；
 *  - 夜班后必休：不存在 night_then_work 冲突；
 *  - 主任白班覆盖：每周至少 1 名 attending 排白班；
 *  - getScheduleConflict：人工构造 5 类违规全部被识别。
 *
 * 仅测纯函数，不触碰 IO / 时钟（日期区间显式传入）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  getScheduleConflict,
  optimizeSchedule,
  type ScheduleConstraints,
  type ShiftAssignment,
  type StaffMember,
} from '../../src/bff/aggregators/smartScheduleAggregator';

const STAFF: StaffMember[] = [
  { id: 'D-001', name: '陈国维', role: 'attending' },
  { id: 'D-002', name: '林雅琴', role: 'attending' },
  { id: 'R-001', name: '赵立群', role: 'resident' },
  { id: 'R-002', name: '黄敏', role: 'resident' },
  { id: 'R-003', name: '周文彬', role: 'resident' },
  { id: 'I-001', name: '吴思远', role: 'intern' },
  { id: 'I-002', name: '徐若曦', role: 'intern' },
];

/** 2026-01-05 是周一，到 2026-01-11 周日，正好一个 ISO 周 */
const WEEK = { start: '2026-01-05', end: '2026-01-11' };

function baseConstraints(over: Partial<ScheduleConstraints> = {}): ScheduleConstraints {
  return {
    staff: STAFF,
    maxWorkdaysPerWeek: 5,
    minDayStaff: 2,
    minNightStaff: 1,
    requireAttendingDay: true,
    ...over,
  };
}

describe('optimizeSchedule · 公平性硬约束', () => {
  const c = baseConstraints();
  const grid = optimizeSchedule('呼吸内科', WEEK.start, WEEK.end, c);
  const conflicts = getScheduleConflict({ assignments: grid.assignments, constraints: c });

  it('产出非空网格，每个工作日都有白班 + 夜班', () => {
    expect(grid.assignments.length).toBeGreaterThan(0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(2026, 0, 5 + i));
      const iso = `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, '0')}-${`${d.getUTCDate()}`.padStart(2, '0')}`;
      const day = grid.assignments.filter((a) => a.date === iso && a.shift === 'day').length;
      const night = grid.assignments.filter((a) => a.date === iso && a.shift === 'night').length;
      expect(day).toBeGreaterThanOrEqual(2);
      expect(night).toBeGreaterThanOrEqual(1);
    }
  });

  it('每人本周工作日 ≤ 5', () => {
    for (const s of STAFF) {
      expect(grid.staffWorkdayCounts[s.id]).toBeLessThanOrEqual(5);
    }
  });

  it('夜班后必休：不存在 night_then_work 冲突', () => {
    expect(conflicts.filter((x) => x.type === 'night_then_work')).toHaveLength(0);
  });

  it('不存在同日双排（double_shift）', () => {
    expect(conflicts.filter((x) => x.type === 'double_shift')).toHaveLength(0);
  });

  it('不存在周工作日超限（over_workdays）', () => {
    expect(conflicts.filter((x) => x.type === 'over_workdays')).toHaveLength(0);
  });

  it('不存在缺岗（understaffed）', () => {
    expect(conflicts.filter((x) => x.type === 'understaffed')).toHaveLength(0);
  });

  it('每周至少 1 名主任医师白班（no_attending_day 为空）', () => {
    expect(conflicts.filter((x) => x.type === 'no_attending_day')).toHaveLength(0);
    const attendingDays = grid.assignments.filter((a) => a.role === 'attending' && a.shift === 'day');
    expect(attendingDays.length).toBeGreaterThanOrEqual(1);
  });

  it('夜班均衡：本周任意两人夜班数 max - min ≤ 1', () => {
    const counts = STAFF.map((s) => grid.staffNightCounts[s.id]);
    const mx = Math.max(...counts);
    const mn = Math.min(...counts);
    expect(mx - mn).toBeLessThanOrEqual(1);
    expect(grid.metrics.nightMaxMinGap).toBeLessThanOrEqual(1);
  });

  it('夜班总数 = 7（每天 1 个）', () => {
    const nightTotal = Object.values(grid.staffNightCounts).reduce((a, b) => a + b, 0);
    expect(nightTotal).toBe(7);
  });
});

describe('getScheduleConflict · 人工构造违规', () => {
  it('识别 double_shift（同日白班+夜班）', () => {
    const bad: ShiftAssignment[] = [
      { staffId: 'R-001', staffName: '赵立群', role: 'resident', date: '2026-01-05', shift: 'day' },
      { staffId: 'R-001', staffName: '赵立群', role: 'resident', date: '2026-01-05', shift: 'night' },
    ];
    const out = getScheduleConflict({ assignments: bad, constraints: baseConstraints() });
    expect(out.some((x) => x.type === 'double_shift')).toBe(true);
  });

  it('识别 night_then_work（夜班次日未休）', () => {
    const bad: ShiftAssignment[] = [
      { staffId: 'R-001', staffName: '赵立群', role: 'resident', date: '2026-01-05', shift: 'night' },
      { staffId: 'R-001', staffName: '赵立群', role: 'resident', date: '2026-01-06', shift: 'day' },
    ];
    const out = getScheduleConflict({ assignments: bad, constraints: baseConstraints() });
    expect(out.some((x) => x.type === 'night_then_work')).toBe(true);
  });

  it('识别 over_workdays（单周 6 个工作日）', () => {
    const bad: ShiftAssignment[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(2026, 0, 5 + i));
      const iso = `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, '0')}-${`${d.getUTCDate()}`.padStart(2, '0')}`;
      bad.push({ staffId: 'R-001', staffName: '赵立群', role: 'resident', date: iso, shift: 'day' });
    }
    const out = getScheduleConflict({ assignments: bad, constraints: baseConstraints() });
    expect(out.some((x) => x.type === 'over_workdays')).toBe(true);
  });

  it('识别 no_attending_day（全是住院医）', () => {
    const bad: ShiftAssignment[] = [
      { staffId: 'I-001', staffName: '吴思远', role: 'intern', date: '2026-01-05', shift: 'day' },
      { staffId: 'I-002', staffName: '徐若曦', role: 'intern', date: '2026-01-05', shift: 'night' },
    ];
    const out = getScheduleConflict({ assignments: bad, constraints: baseConstraints() });
    expect(out.some((x) => x.type === 'no_attending_day')).toBe(true);
  });

  it('识别 understaffed（白班只排了 1 人，要求 2 人）', () => {
    const bad: ShiftAssignment[] = [
      { staffId: 'D-001', staffName: '陈国维', role: 'attending', date: '2026-01-05', shift: 'day' },
      { staffId: 'R-001', staffName: '赵立群', role: 'resident', date: '2026-01-05', shift: 'night' },
    ];
    const out = getScheduleConflict({ assignments: bad, constraints: baseConstraints() });
    expect(out.some((x) => x.type === 'understaffed')).toBe(true);
  });
});

describe('optimizeSchedule · 边界', () => {
  it('员工池不足以覆盖 minDayStaff 时，metrics.uncovered 正确上报，不抛错', () => {
    const c = baseConstraints({ staff: [STAFF[0]], minDayStaff: 2, minNightStaff: 1 });
    const grid = optimizeSchedule('X科', WEEK.start, WEEK.end, c);
    expect(grid.metrics.uncovered.length).toBeGreaterThan(0);
  });

  it('空员工池返回空网格，不抛错', () => {
    const grid = optimizeSchedule('空科', WEEK.start, WEEK.end, baseConstraints({ staff: [] }));
    expect(grid.assignments).toHaveLength(0);
    expect(grid.metrics.nightMaxMinGap).toBe(0);
  });
});
