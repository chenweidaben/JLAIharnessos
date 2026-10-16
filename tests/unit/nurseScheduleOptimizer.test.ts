/**
 * 健澜科技 jlmedaios - 护士智能排班优化纯函数单测（M184-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  MAX_CONSECUTIVE_NIGHTS,
  optimizeNurseSchedule,
  type NurseStaff,
} from '../../src/bff/aggregators/nurseScheduleOptimizer';

function makeNurses(n: number): NurseStaff[] {
  return Array.from({ length: n }, (_, i) => ({
    staffId: `nurse-${i + 1}`,
    staffName: `护士${i + 1}`,
    consecutiveNights: 0,
    offToday: false,
  }));
}

describe('optimizeNurseSchedule 床护比约束', () => {
  it('患者数 40 → 白班需求 5 人（40/8 向上取整）', () => {
    const plan = optimizeNurseSchedule('内科', '2026-10-16', makeNurses(10), 40);
    const day = plan.shifts.find((s) => s.shiftType === 'day')!;
    expect(day.required).toBe(5);
  });

  it('患者数 0 → 最少需求 1 人', () => {
    const plan = optimizeNurseSchedule('内科', '2026-10-16', makeNurses(5), 0);
    for (const s of plan.shifts) {
      expect(s.required).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('optimizeNurseSchedule 夜班公平性', () => {
  it('连续夜班达上限的护士不被排夜班', () => {
    const staff: NurseStaff[] = [
      { staffId: 'a', staffName: 'A', consecutiveNights: MAX_CONSECUTIVE_NIGHTS, offToday: false },
      { staffId: 'b', staffName: 'B', consecutiveNights: 0, offToday: false },
      { staffId: 'c', staffName: 'C', consecutiveNights: 0, offToday: false },
    ];
    const plan = optimizeNurseSchedule('内科', '2026-10-16', staff, 16);
    const night = plan.shifts.find((s) => s.shiftType === 'night')!;
    expect(night.assigned).not.toContain('a');
  });
});

describe('optimizeNurseSchedule 休假与缺口', () => {
  it('休假护士不计入在岗', () => {
    const staff: NurseStaff[] = [
      { staffId: 'a', staffName: 'A', offToday: true },
      { staffId: 'b', staffName: 'B', offToday: false },
    ];
    const plan = optimizeNurseSchedule('内科', '2026-10-16', staff, 40);
    const day = plan.shifts.find((s) => s.shiftType === 'day')!;
    expect(day.gap).toBe(4);
    expect(plan.feasible).toBe(false);
  });

  it('人员充足时 feasible=true', () => {
    const plan = optimizeNurseSchedule('内科', '2026-10-16', makeNurses(20), 40);
    expect(plan.feasible).toBe(true);
    expect(plan.conflicts.length).toBe(0);
  });
});
