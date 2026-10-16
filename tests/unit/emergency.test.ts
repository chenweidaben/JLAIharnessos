/**
 * 健澜科技 jlmedaios - M162-A 医院安全与应急管理 单测
 *
 * 覆盖：预案生成（五情景命中/别名/兜底降级）、现场核对表、演练排期（编号/提前提醒/情景推断）、
 *       演练效果评估（加权打分定级/瓶颈定位/空指标降级）。纯函数、无 I/O。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildEmergencyPlan,
  emergencyResponseChecklist,
  evaluateDrillResult,
  scheduleEmergencyDrill,
} from '../../src/bff/aggregators/emergencyAggregator.js';

describe('M162-A 应急预案生成 buildEmergencyPlan', () => {
  it('火灾疏散：命中内置库，返回完整指挥/阶段/动作/物资/通报', () => {
    const plan = buildEmergencyPlan('fire_evacuation');
    expect(plan.matched).toBe(true);
    expect(plan.level).toBe('Ⅰ级');
    expect(plan.command.length).toBeGreaterThan(0);
    expect(plan.phases.length).toBeGreaterThan(0);
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.resources.length).toBeGreaterThan(0);
    expect(plan.communication.length).toBeGreaterThan(0);
    expect(plan.actions.some((a) => a.critical)).toBe(true);
  });

  it('中文别名命中：「停电」→ 停电应急', () => {
    const plan = buildEmergencyPlan('停电');
    expect(plan.matched).toBe(true);
    expect(plan.scenario).toBe('power_outage');
    expect(plan.scenarioName).toContain('停电');
  });

  it('五情景均可命中（批量伤员/火灾/停电/系统故障/传染病）', () => {
    for (const sc of ['mass_casualty', 'fire_evacuation', 'power_outage', 'it_failure', 'outbreak']) {
      expect(buildEmergencyPlan(sc).matched).toBe(true);
    }
  });

  it('未知情景：安全降级为兜底骨架 matched=false', () => {
    const plan = buildEmergencyPlan('地震海啸XYZ');
    expect(plan.matched).toBe(false);
    expect(plan.actions).toHaveLength(0);
    expect(plan.command).toHaveLength(0);
    expect(plan.disclaimer).toContain('医院全场景');
  });

  it('空/非法输入不抛错', () => {
    expect(buildEmergencyPlan('').matched).toBe(false);
    expect(buildEmergencyPlan(null as unknown as string).matched).toBe(false);
  });
});

describe('M162-A 现场处置核对表 emergencyResponseChecklist', () => {
  it('火灾：返回有序核对表且含关键必做项', () => {
    const list = emergencyResponseChecklist('火灾疏散');
    expect(list.length).toBeGreaterThan(3);
    expect(list[0].order).toBe(1);
    expect(list.some((i) => i.critical)).toBe(true);
    expect(list.every((i) => typeof i.action === 'string' && i.responsible)).toBe(true);
  });

  it('未知情景返回空数组', () => {
    expect(emergencyResponseChecklist('不存在的情景')).toHaveLength(0);
  });
});

describe('M162-A 演练排期 scheduleEmergencyDrill', () => {
  it('按 planId 推断火灾情景，生成编号与提前3天提醒', () => {
    const s = scheduleEmergencyDrill('fire_evacuation-001', '2026-12-01');
    expect(s.drillId).toMatch(/^DRILL-20261201-/);
    expect(s.drillId).toContain('001');
    expect(s.scenario).toBe('fire_evacuation');
    expect(s.status).toBe('scheduled');
    expect(s.participants.length).toBeGreaterThan(0);
    expect(s.objectives.length).toBeGreaterThan(0);
    // remindAt = 2026-12-01 前 3 天 = 2026-11-28
    expect(s.remindAt.startsWith('2026-11-28')).toBe(true);
  });

  it('信息系统故障：演练形式为桌面推演 tabletop', () => {
    const s = scheduleEmergencyDrill('it_failure-002', '2026-10-01');
    expect(s.scenario).toBe('it_failure');
    expect(s.drillType).toBe('tabletop');
  });

  it('非法日期：默认今天+30天，仍返回合法排期', () => {
    const s = scheduleEmergencyDrill('mass_casualty-001', 'not-a-date');
    expect(s.scheduledDate).toBeTruthy();
    expect(Number.isFinite(new Date(s.scheduledDate).getTime())).toBe(true);
    expect(s.scenario).toBe('mass_casualty');
  });
});

describe('M162-A 演练效果评估 evaluateDrillResult', () => {
  it('表现优异：总分高、定级优秀、无瓶颈', () => {
    const ev = evaluateDrillResult('DRILL-20261201-001', {
      responseTimeSec: 60,
      arrivalTimeSec: 120,
      evacuationRate: 95,
      communicationSuccessRate: 98,
      equipmentReadyRate: 99,
    });
    expect(ev.grade).toBe('优秀');
    expect(ev.passed).toBe(true);
    expect(ev.score).toBeGreaterThanOrEqual(90);
    expect(ev.bottlenecks).toHaveLength(0);
  });

  it('多项不达标：定位瓶颈并给出整改建议，定级不合格', () => {
    const ev = evaluateDrillResult('DRILL-20261201-002', {
      responseTimeSec: 300, // 40 分
      arrivalTimeSec: 300, // 60 分
      evacuationRate: 50, // 50 分
      communicationSuccessRate: 60, // 60 分
      equipmentReadyRate: 70, // 70 分（不<70，不列瓶颈）
      issuesFound: 3,
    });
    expect(ev.grade).toBe('不合格');
    expect(ev.passed).toBe(false);
    expect(ev.score).toBeLessThan(70);
    // responseTime / arrivalTime / evacuationRate / communication 四项 <70
    expect(ev.bottlenecks.length).toBe(4);
    expect(ev.improvements.length).toBeGreaterThanOrEqual(4);
    expect(ev.improvements.join('')).toContain('3 个问题');
  });

  it('空指标：安全降级为 0 分不合格', () => {
    const ev = evaluateDrillResult('DRILL-X', {});
    expect(ev.score).toBe(0);
    expect(ev.grade).toBe('不合格');
    expect(ev.passed).toBe(false);
  });
});
