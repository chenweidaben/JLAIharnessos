/**
 * 健澜科技 jlmedaios - 护理排班合规 + NQI 指标计算 纯函数单测（M16-B）
 *
 * 覆盖：连班/周工时/单班覆盖/冲突/休假（排班引擎）；
 *       分子分母/方向/未接入标注/人工录入校验（指标引擎）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  validateSchedule,
  type ScheduleAssignment,
} from '../../src/medical-tools/nursing/scheduleRules';
import {
  computeIndicators,
  validateManualEntry,
  type RawWindowMetrics,
} from '../../src/medical-tools/nursing/nqiIndicators';

function a(partial: Partial<ScheduleAssignment> & Pick<ScheduleAssignment, 'nurseId' | 'date'>): ScheduleAssignment {
  return {
    wardId: 'ward1', shiftId: 'day', shiftName: '白班', hours: 8, isNight: false, ...partial,
  };
}

describe('M16-B 排班合规引擎', () => {
  it('合规排班：无违规', () => {
    const r = validateSchedule(
      [a({ nurseId: 'n1', date: '2026-10-01' }), a({ nurseId: 'n2', date: '2026-10-01' })],
      new Map(),
      new Map([['day', 2]]),
    );
    expect(r.compliant).toBe(true);
    expect(r.summary.errors).toBe(0);
  });

  it('同护士同日多班次 → same_day_conflict', () => {
    const r = validateSchedule(
      [a({ nurseId: 'n1', date: '2026-10-01', shiftId: 'day' }), a({ nurseId: 'n1', date: '2026-10-01', shiftId: 'mid' })],
      new Map(),
      new Map(),
    );
    expect(r.compliant).toBe(false);
    expect(r.violations.some((v) => v.type === 'same_day_conflict')).toBe(true);
  });

  it('休假当天被排班 → leave_conflict', () => {
    const r = validateSchedule(
      [a({ nurseId: 'n1', date: '2026-10-01' })],
      new Map([['n1', new Set(['2026-10-01'])]]),
      new Map(),
    );
    expect(r.violations.some((v) => v.type === 'leave_conflict')).toBe(true);
  });

  it('连续夜班超过上限 → consecutive_nights', () => {
    const nights = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((d) =>
      a({ nurseId: 'n1', date: d, shiftId: 'night', isNight: true }),
    );
    const r = validateSchedule(nights, new Map(), new Map());
    expect(r.violations.some((v) => v.type === 'consecutive_nights')).toBe(true);
  });

  it('夜班后次日仍排班 → rest_after_night warning', () => {
    const r = validateSchedule(
      [
        a({ nurseId: 'n1', date: '2026-10-01', shiftId: 'night', isNight: true }),
        a({ nurseId: 'n1', date: '2026-10-02', shiftId: 'day', isNight: false }),
      ],
      new Map(),
      new Map(),
    );
    expect(r.violations.some((v) => v.type === 'rest_after_night')).toBe(true);
  });

  it('周工时超上限 → weekly_hours', () => {
    // 8h*7 = 56h > 48h
    const days = ['01', '02', '03', '04', '05', '06', '07'].map((d) =>
      a({ nurseId: 'n1', date: `2026-10-${d}`, hours: 8 }),
    );
    const r = validateSchedule(days, new Map(), new Map());
    expect(r.violations.some((v) => v.type === 'weekly_hours')).toBe(true);
  });

  it('单班在岗不足 → shift_coverage', () => {
    const r = validateSchedule(
      [a({ nurseId: 'n1', date: '2026-10-01', shiftId: 'day' })],
      new Map(),
      new Map([['day', 3]]),
    );
    expect(r.violations.some((v) => v.type === 'shift_coverage')).toBe(true);
  });
});

describe('M16-B NQI 指标引擎', () => {
  const base: RawWindowMetrics = {
    bedCount: 40, nurseCount: 10, onDutyNurseCount: 5, inpatientCount: 30,
    highPressureRiskCount: 3, highFallRiskCount: 6, scheduledCount: 100, compliantScheduledCount: 95,
  };

  it('自动指标：床护比/护患比/高危率/合规率', () => {
    const res = computeIndicators(base, {});
    const get = (code: string) => res.find((r) => r.code === code)!;
    expect(get('NQI_BED_NURSE_RATIO').value).toBe(4); // 40/10
    expect(get('NQI_NURSE_PATIENT_RATIO').value).toBe(6); // 30/5
    expect(get('NQI_PRESSURE_HIGH_RISK').value).toBe(10); // 3/30*100
    expect(get('NQI_FALL_HIGH_RISK').value).toBe(20);
    expect(get('NQI_SHIFT_COMPLIANCE').value).toBe(95);
    for (const code of ['NQI_BED_NURSE_RATIO', 'NQI_PRESSURE_HIGH_RISK', 'NQI_FALL_HIGH_RISK', 'NQI_SHIFT_COMPLIANCE']) {
      expect(get(code).sourceStatus).toBe('auto');
    }
  });

  it('未接入指标：标 pending_manual、不编造数字', () => {
    const res = computeIndicators(base, {});
    const med = res.find((r) => r.code === 'NQI_MED_ERROR')!;
    expect(med.sourceStatus).toBe('pending_manual');
    expect(med.numerator).toBeNull();
    expect(med.value).toBeNull();
    expect(med.note).toContain('人工录入');
  });

  it('人工补全 pending 指标后变为 auto', () => {
    const res = computeIndicators(base, { NQI_FALL_INCIDENT: { numerator: 1, denominator: 30 } });
    const fall = res.find((r) => r.code === 'NQI_FALL_INCIDENT')!;
    expect(fall.sourceStatus).toBe('auto');
    expect(fall.value).toBe(3.3);
  });

  it('人工录入校验：分子≤分母、非负', () => {
    expect(validateManualEntry(1, 10).ok).toBe(true);
    expect(validateManualEntry(11, 10).ok).toBe(false);
    expect(validateManualEntry(-1, 10).ok).toBe(false);
  });

  it('分母为 0 时比值不爆栈', () => {
    const res = computeIndicators({ ...base, nurseCount: 0, onDutyNurseCount: 0, inpatientCount: 0 }, {});
    expect(res.find((r) => r.code === 'NQI_BED_NURSE_RATIO')!.value).toBeNull();
  });
});
