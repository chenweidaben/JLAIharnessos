/**
 * 健澜科技 jlmedaios - 医疗设备管理深化纯函数单测（M177-C）【病案设备耗材】
 *
 * 覆盖：
 *  - trackEquipmentLifecycle：台账五段时间轴、在用/报废当前段、投入使用天数；
 *  - scheduleEquipmentMaintenance：按周期推下次保养日，逾期 / 临期 / 正常三态；
 *  - calculateEquipmentDepreciation：年限平均法累计折旧与账面净值；
 *  - buildDeepEquipmentMgmt：四维度看板汇总不散架。
 * 与持久化解耦，不触库，不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  buildDeepEquipmentMgmt,
  calculateEquipmentDepreciation,
  resetDeepEquipmentStore,
  scheduleEquipmentMaintenance,
  trackEquipmentLifecycle,
} from '../../src/bff/aggregators/equipmentDeepAggregator';

/** 统一参考日，保证月数/天数可预期 */
const NOW = new Date('2026-10-16T09:00:00');

beforeEach(() => {
  resetDeepEquipmentStore();
});

describe('trackEquipmentLifecycle（台账五段全生命周期）', () => {
  it('在用设备：采购→验收→入账→使用 四段已完成，报废段未发生，当前段=使用', () => {
    const t = trackEquipmentLifecycle('eq_0001', NOW);
    expect(t.assetNo).toBe('SB-2021-0001');
    expect(t.currentStage).toBe('in_use');
    expect(t.currentLabel).toBe('使用');
    expect(t.scrapped).toBe(false);
    expect(t.stages.map((s) => s.stage)).toEqual([
      'purchase', 'acceptance', 'capitalization', 'in_use', 'scrapped',
    ]);
    expect(t.stages.find((s) => s.stage === 'scrapped')?.status).toBe('pending');
    // 当前段标记为 current（采购/验收/入账已 done，使用段进行中=current）
    expect(t.stages.find((s) => s.stage === 'in_use')?.status).toBe('current');
    expect(t.stages.filter((s) => s.status === 'done').length).toBe(3);
    expect(t.inUseDays).toBeGreaterThan(0);
  });

  it('已报废设备：当前段收敛到报废，不再停留在使用段', () => {
    const t = trackEquipmentLifecycle('eq_0005', NOW);
    expect(t.currentStage).toBe('scrapped');
    expect(t.scrapped).toBe(true);
    // 报废前累计的使用天数（2018-07-05 ~ 2025-12-31）
    expect(t.inUseDays).toBeGreaterThan(0);
  });

  it('未知设备抛错，不静默返回空台账（账实对不上的根因要报出来）', () => {
    expect(() => trackEquipmentLifecycle('eq_9999', NOW)).toThrow(/设备不存在/);
  });
});

describe('scheduleEquipmentMaintenance（保养计划排程）', () => {
  it('逾期设备：上次保养过久，下次到期已在过去，标 overdue 并给出逾期天数', () => {
    // eq_0002 上次保养 2026-01-15，周期 6 个月 -> 下次 2026-07-15，参考日 2026-10-16 已逾期
    const s = scheduleEquipmentMaintenance('eq_0002', NOW);
    expect(s.nextDueDate).toBe('2026-07-15');
    expect(s.status).toBe('overdue');
    expect(s.overdueDays).toBeGreaterThan(60);
    expect(s.suggestedAction).toContain('立即安排');
    // 该设备还有未结故障，建议里应提示一并排查
    expect(s.suggestedAction).toContain('未结故障');
  });

  it('临期/正常设备：未来 30 天内 due-soon，更远 on-track', () => {
    // eq_0001 上次 2026-06-01，周期 6 个月 -> 下次 2026-12-01，距参考日 46 天 -> on-track
    const s = scheduleEquipmentMaintenance('eq_0001', NOW);
    expect(s.nextDueDate).toBe('2026-12-01');
    expect(s.status).toBe('on-track');
    expect(s.daysUntilDue).toBe(46);
  });
});

describe('calculateEquipmentDepreciation（折旧计算）', () => {
  it('年限平均法：从入账日计提，累计折旧与账面净值可复算', () => {
    // eq_0001：原值 1200 万，残值率 5%，年限 8 年；入账 2021-04，参考 2026-10 = 66 个月
    const d = calculateEquipmentDepreciation('eq_0001', '2026-10-16');
    expect(d.method).toBe('straight_line');
    expect(d.originalValue).toBe(12_000_000);
    expect(d.residualValue).toBe(600_000);
    expect(d.usefulLifeYears).toBe(8);
    expect(d.monthsElapsed).toBe(66);
    // 年折旧 = (1200万 - 60万) / 8 = 142.5万；月折旧 11.875万
    expect(d.annualDepreciation).toBe(1_425_000);
    expect(d.monthlyDepreciation).toBe(118_750);
    // 累计 = 118,750 × 66 = 7,837,500；净值 = 12,000,000 - 7,837,500 = 4,162,500
    expect(d.accumulatedDepreciation).toBe(7_837_500);
    expect(d.netBookValue).toBe(4_162_500);
  });

  it('净值不低于残值：即便计提超过年限，净值封顶在残值', () => {
    // eq_0005 已报废，6 年年限，参考日已远超折旧年限
    const d = calculateEquipmentDepreciation('eq_0005', '2026-10-16');
    expect(d.netBookValue).toBeGreaterThanOrEqual(d.residualValue);
    expect(d.monthsElapsed).toBeLessThanOrEqual(d.usefulLifeYears * 12);
  });
});

describe('buildDeepEquipmentMgmt（四维看板汇总）', () => {
  it('台账/维保/计量/折旧四块齐全，逾期维保与强检到期被抛出', () => {
    const r = buildDeepEquipmentMgmt(NOW) as unknown as {
      ledger: { total: number; byStage: Record<string, number>; totalOriginalValue: number };
      maintenance: { overdueCount: number; openFaultCount: number; alerts: Array<{ equipmentId: string; status: string }> };
      metrology: { mandatoryCount: number; expiredCertCount: number };
      depreciation: { totalOriginalValue: number; totalAccumulated: number; totalNetBookValue: number };
      devices: unknown[];
    };
    expect(r.ledger.total).toBe(5);
    expect(r.ledger.byStage['scrapped']).toBe(1);
    expect(r.maintenance.overdueCount).toBeGreaterThan(0);
    expect(r.maintenance.openFaultCount).toBe(1); // eq_0002 球管散热报警未结
    expect(r.metrology.mandatoryCount).toBe(4);
    // 账面净值 = 原值 - 累计折旧
    expect(r.depreciation.totalNetBookValue).toBeCloseTo(
      r.depreciation.totalOriginalValue - r.depreciation.totalAccumulated, 2,
    );
    expect(r.devices.length).toBe(5);
  });
});
