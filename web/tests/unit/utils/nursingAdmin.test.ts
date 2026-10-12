/**
 * 健澜科技 jlmedaios - 护理管理后台纯函数单测（M16-B / M16B_TEST）
 * 覆盖边界：连班 / 周工时 / 单班覆盖 / 冲突 / 休假联动；指标分母校验 / 方向 / 四分位 / 趋势 /
 * 未接入数据源（null 不渲染编造数字）。
 */
import { describe, it, expect } from 'vitest';
import {
  auditSchedule,
  calcRate,
  checkConsecutiveShifts,
  checkCoverage,
  checkLeaveBlocking,
  checkWeeklyHours,
  detectConflicts,
  evaluateIndicator,
  monthlyTrend,
  quartiles,
  validateIndicatorEntry,
  weeklyWorkMinutes,
} from '@/utils/nursingAdmin';
import type { ScheduleAssignment } from '@/types/nursingAdmin';

const a = (over: Partial<ScheduleAssignment>): ScheduleAssignment => ({
  id: over.id ?? 'x',
  wardCode: 'NW1',
  nurseId: 'n1',
  nurseName: '护士甲',
  date: '2026-10-12',
  shiftId: 's1',
  shiftName: '早班',
  isNight: false,
  hours: 8,
  ...over,
});

describe('M16B_TEST 排班合规', () => {
  it('连班：夜班次日再排 → warning', () => {
    const list = [
      a({ id: '1', date: '2026-10-12', isNight: true }),
      a({ id: '2', date: '2026-10-13', isNight: false }),
    ];
    const issues = checkConsecutiveShifts(list);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('consecutive');
  });
  it('连班：夜班次日休息 → 无问题', () => {
    const list = [a({ id: '1', date: '2026-10-12', isNight: true })];
    expect(checkConsecutiveShifts(list)).toHaveLength(0);
  });

  it('周工时：累加本周边分钟数', () => {
    const list = [
      a({ id: '1', date: '2026-10-12', hours: 8 }),
      a({ id: '2', date: '2026-10-14', hours: 8 }),
    ];
    expect(weeklyWorkMinutes(list, 'n1', '2026-10-12')).toBe(16 * 60);
  });
  it('周工时超限 → warning', () => {
    const list: ScheduleAssignment[] = [];
    for (let i = 0; i < 7; i += 1) {
      list.push(a({ id: `w${i}`, date: `2026-10-1${2 + i}`, hours: 8 }));
    }
    // 7*8=56h > 48h
    expect(checkWeeklyHours(list, '2026-10-12').some((x) => x.type === 'weekly_hours')).toBe(true);
  });

  it('单班覆盖：实配<应配 → error', () => {
    const list = [a({ id: '1', date: '2026-10-12', shiftName: '早班' })];
    const issues = checkCoverage(list, { 早班: 2, 夜班: 1 }, ['2026-10-12']);
    expect(issues.some((x) => x.type === 'coverage' && x.message.includes('早班'))).toBe(true);
    expect(issues.some((x) => x.message.includes('夜班'))).toBe(true);
  });

  it('冲突：同护士同日两班 → error', () => {
    const list = [
      a({ id: '1', date: '2026-10-12', shiftName: '早班' }),
      a({ id: '2', date: '2026-10-12', shiftName: '夜班' }),
    ];
    const issues = detectConflicts(list);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('conflict');
  });

  it('休假联动：已批准休假覆盖排班日 → error', () => {
    const list = [a({ id: '1', nurseId: 'n1', nurseName: '护士甲', date: '2026-10-13' })];
    const leaves = [
      { id: 'l1', wardCode: 'NW1', nurseId: 'n1', nurseName: '护士甲', startDate: '2026-10-13', endDate: '2026-10-15', type: 'annual' as const, status: 'approved' as const },
    ];
    const issues = checkLeaveBlocking(list, leaves);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('leave');
  });

  it('auditSchedule 汇总确定性排序', () => {
    const list = [
      a({ id: '1', nurseId: 'n1', date: '2026-10-12', shiftName: '早班' }),
      a({ id: '2', nurseId: 'n1', date: '2026-10-12', shiftName: '夜班' }),
    ];
    const issues = auditSchedule(list, [], { 早班: 3 }, ['2026-10-12'], '2026-10-12');
    expect(issues[0].type).toBe('conflict'); // 优先级最高
  });
});

describe('M16B_TEST 敏感指标', () => {
  it('分母校验：分子>分母/负/分母0 均报错', () => {
    expect(validateIndicatorEntry(5, 10).ok).toBe(true);
    expect(validateIndicatorEntry(11, 10).errors.join()).toContain('分子不可大于分母');
    expect(validateIndicatorEntry(-1, 10).errors.join()).toContain('分子不可为负');
    expect(validateIndicatorEntry(5, 0).errors.join()).toContain('分母必须大于 0');
  });
  it('率：分母为 0 → null（待人工录入，不编造）', () => {
    expect(calcRate(5, 10)).toBe(50);
    expect(calcRate(5, 0)).toBeNull();
  });
  it('方向：high_good 达标/预警；low_good 反向', () => {
    expect(evaluateIndicator(95, 90, 'high_good')).toBe('good');
    expect(evaluateIndicator(80, 90, 'high_good')).toBe('warning');
    expect(evaluateIndicator(3, 5, 'low_good')).toBe('good');
    expect(evaluateIndicator(8, 5, 'low_good')).toBe('warning');
    expect(evaluateIndicator(null, 90, 'high_good')).toBe('unknown');
  });
  it('四分位：线性插值', () => {
    const q = quartiles([1, 2, 3, 4]);
    expect(q.q1).toBe(1.75);
    expect(q.median).toBe(2.5);
    expect(q.q3).toBe(3.25);
    expect(quartiles([]).median).toBe(0);
  });
  it('趋势：环比百分点；不足2点为0', () => {
    expect(monthlyTrend([{ period: '2026-09', value: 80 }, { period: '2026-10', value: 85.5 }])).toBe(5.5);
    expect(monthlyTrend([{ period: '2026-10', value: 85 }])).toBe(0);
  });
});
