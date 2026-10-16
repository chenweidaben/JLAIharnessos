/**
 * 健澜科技 jlmedaios — M161-D 医院资源智能调配纯函数单测
 *
 * 覆盖：
 *  - optimizeBedAllocation（过载借床 / 闲置支援 / 健康区间）；
 *  - optimizeOperatingRoom（急诊优先插队、等待最小化、排不下顺延 deferred）；
 *  - optimizeStaffAssignment（技能硬过滤、加班最少者优先、超上限自动跳过=公平不总加班）；
 *  - getResourceUtilization（三维利用率与瓶颈定位）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  BED_TARGET_HIGH,
  BED_TARGET_LOW,
  getResourceUtilization,
  optimizeBedAllocation,
  optimizeOperatingRoom,
  optimizeStaffAssignment,
  type OperatingRoom,
  type StaffMember,
  type SurgerySlot,
} from '../../src/bff/aggregators/resourceOptimizeAggregator';

/* ------------------------------------------------------------------ */
/* 床位调配                                                             */
/* ------------------------------------------------------------------ */

describe('optimizeBedAllocation（床位调配）', () => {
  it('预测过载时建议借床并给出转出调剂', () => {
    const r = optimizeBedAllocation(
      { deptId: 'd1', deptName: '骨科', totalBeds: 60, occupiedBeds: 56 },
      { expectedAdmissions: 12, expectedDischarges: 6, criticalCareNeeded: 2 },
    );
    // 56+12-6 = 62，投影占用率 > 92%
    expect(r.projectedUtilization).toBeGreaterThan(BED_TARGET_HIGH);
    expect(r.requestedBeds).toBeGreaterThan(0);
    expect(r.transfers.length).toBeGreaterThan(0);
    expect(r.specialBedsNeeded).toBe(2);
  });

  it('预测闲置时计算可对外支援的床位数', () => {
    const r = optimizeBedAllocation(
      { deptId: 'd2', deptName: '内科', totalBeds: 60, occupiedBeds: 20 },
      { expectedAdmissions: 2, expectedDischarges: 5 },
    );
    expect(r.projectedUtilization).toBeLessThan(BED_TARGET_LOW);
    expect(r.spareBeds).toBeGreaterThan(0);
    expect(r.requestedBeds).toBe(0);
  });

  it('占用率落在健康区间时不借床也不放床', () => {
    const r = optimizeBedAllocation(
      { deptId: 'd3', deptName: '普外科', totalBeds: 60, occupiedBeds: 50 },
      { expectedAdmissions: 8, expectedDischarges: 6 },
    );
    expect(r.projectedUtilization).toBeGreaterThanOrEqual(BED_TARGET_LOW);
    expect(r.projectedUtilization).toBeLessThanOrEqual(BED_TARGET_HIGH);
    expect(r.requestedBeds).toBe(0);
    expect(r.spareBeds).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* 手术室优化                                                           */
/* ------------------------------------------------------------------ */

describe('optimizeOperatingRoom（手术室排程）', () => {
  const rooms: OperatingRoom[] = [{ roomId: 'OR-1', openMin: 8 * 60, closeMin: 17 * 60 }];

  it('急诊手术优先插队，常规手术顺延等待', () => {
    const slots: SurgerySlot[] = [
      { surgeryId: 'routine-1', specialty: 'general', durationMin: 60, urgency: 'routine', requestedStartMin: 8 * 60 },
      { surgeryId: 'emerg-1', specialty: 'general', durationMin: 45, urgency: 'emergency', requestedStartMin: 10 * 60 },
    ];
    const r = optimizeOperatingRoom(slots, rooms);
    expect(r.schedule.length).toBe(2);
    // 急诊在 10:00 准点开台，常规被挤到急诊之后 → 产生等待
    const emerg = r.schedule.find((s) => s.surgeryId === 'emerg-1')!;
    expect(emerg.startMin).toBe(10 * 60);
    expect(emerg.waitMin).toBe(0);
    const routine = r.schedule.find((s) => s.surgeryId === 'routine-1')!;
    expect(routine.startMin).toBeGreaterThanOrEqual(emerg.endMin);
    expect(routine.waitMin).toBeGreaterThan(0);
    expect(r.totalWaitMin).toBeGreaterThan(0);
  });

  it('排不进当日窗口的手术顺延到 deferred', () => {
    const shortRoom: OperatingRoom[] = [{ roomId: 'OR-X', openMin: 8 * 60, closeMin: 9 * 60 }]; // 仅 60min 窗口
    const slots: SurgerySlot[] = [
      { surgeryId: 'long-1', specialty: 'general', durationMin: 90, urgency: 'routine', requestedStartMin: 8 * 60 },
    ];
    const r = optimizeOperatingRoom(slots, shortRoom);
    expect(r.schedule.length).toBe(0);
    expect(r.deferred.length).toBe(1);
    expect(r.deferred[0].surgeryId).toBe('long-1');
  });

  it('利用率与空置分钟数落在合法区间', () => {
    const slots: SurgerySlot[] = [
      { surgeryId: 's1', specialty: 'general', durationMin: 60, urgency: 'routine', requestedStartMin: 8 * 60 },
    ];
    const r = optimizeOperatingRoom(slots, rooms);
    expect(r.utilization).toBeGreaterThan(0);
    expect(r.utilization).toBeLessThanOrEqual(1);
    expect(r.idleMin).toBeGreaterThanOrEqual(0);
  });
});

/* ------------------------------------------------------------------ */
/* 人员匹配（公平核心）                                                 */
/* ------------------------------------------------------------------ */

const pool: StaffMember[] = [
  { staffId: 'a', name: 'A', skills: ['anesthesia'], weeklyOvertimeHours: 2, maxOvertimeAllowed: 8, availableShifts: ['day', 'night'] },
  { staffId: 'b', name: 'B', skills: ['anesthesia'], weeklyOvertimeHours: 6, maxOvertimeAllowed: 8, availableShifts: ['day'] },
  { staffId: 'c', name: 'C', skills: ['anesthesia'], weeklyOvertimeHours: 9, maxOvertimeAllowed: 8, availableShifts: ['day'] },
  { staffId: 'd', name: 'D', skills: ['general'], weeklyOvertimeHours: 1, maxOvertimeAllowed: 8, availableShifts: ['day'] },
];

describe('optimizeStaffAssignment（人员匹配与公平轮班）', () => {
  it('不对症的员工绝不被派工（技能硬过滤）', () => {
    const r = optimizeStaffAssignment(
      {},
      { requiredSkill: 'anesthesia', shift: 'day', requiredCount: 2, expectedHours: 4 },
      pool,
    );
    const names = r.assignments.map((a) => a.name);
    expect(names).not.toContain('D'); // D 是 general，不对症
  });

  it('本周已加班接近上限者被自动跳过，不被继续压派（不总加班）', () => {
    const r = optimizeStaffAssignment(
      {},
      { requiredSkill: 'anesthesia', shift: 'day', requiredCount: 2, expectedHours: 4 },
      pool,
    );
    // C 当前已加班 9h，再加 4h = 13h 远超上限 8h → 跳过并列入 overloadedStaff
    expect(r.overloadedStaff.join(';')).toContain('C');
    // B 当前 6h + 4h = 10h 也超上限 → 同样跳过
    expect(r.overloadedStaff.join(';')).toContain('B');
    // 只剩 A 能上，需求 2 人 → 有未满足
    expect(r.assignments.map((a) => a.name)).toEqual(['A']);
    expect(r.unmetDemand).toBe(1);
  });

  it('都在上限内时，加班最少者优先派工（加班摊薄、不挑软柿子）', () => {
    const r = optimizeStaffAssignment(
      {},
      { requiredSkill: 'anesthesia', shift: 'day', requiredCount: 2, expectedHours: 1 },
      // 把上限放宽，让 A/B/C 都能上，验证「少加班者优先」
      pool.map((p) => ({ ...p, maxOvertimeAllowed: 20 })),
    );
    // A(2) 与 B(6) 应排在 C(9) 之前被选中
    const names = r.assignments.map((a) => a.name);
    expect(names).toEqual(['A', 'B']);
    expect(names).not.toContain('C');
    expect(r.unmetDemand).toBe(0);
    // 两人投影加班越接近越公平（标准差小 → 公平分良好；A=3h/B=7h，得 0.75）
    expect(r.fairnessScore).toBeGreaterThan(0.7);
  });
});

/* ------------------------------------------------------------------ */
/* 利用率体检                                                           */
/* ------------------------------------------------------------------ */

describe('getResourceUtilization（资源利用率体检）', () => {
  it('按三维度加权并定位最紧张环节', () => {
    const r = getResourceUtilization(
      { deptName: '骨科' },
      'day',
      { bedOccupied: 56, bedTotal: 60, orUsedMin: 315, orTotalMin: 540, staffHoursUsed: 120, staffHoursBudget: 140 },
    );
    expect(r.bedUtilization).toBeGreaterThan(0.9); // 床位最紧张
    expect(r.bottleneck).toBe('beds');
    expect(r.overallScore).toBeGreaterThan(0);
    expect(r.overallScore).toBeLessThanOrEqual(1);
  });

  it('三维度都不紧时判定为均衡', () => {
    const r = getResourceUtilization(
      { deptName: '体检中心' },
      'week',
      { bedOccupied: 30, bedTotal: 60, orUsedMin: 200, orTotalMin: 540, staffHoursUsed: 80, staffHoursBudget: 140 },
    );
    expect(r.bottleneck).toBe('balanced');
  });
});
