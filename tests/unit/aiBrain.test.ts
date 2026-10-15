/**
 * 健澜科技 jlmedaios - AI 医院大脑实时大屏纯函数单测（M156-B，集团与科研）
 *
 * 覆盖：
 *  - 大屏数据 buildHospitalBrain：四类指标字段齐全、demo=true、数值落在演示区间、
 *    固定 seed 可复现（同 seed 两次调用数值一致）；
 *  - 预警生成：床位率 / 危急值 / 院感超阈值 → 高优先级建议；
 *    药品库存 / 设备故障 / 手术间数 → 中优先级建议；
 *    候诊过长 → 低优先级建议；平稳工况 → 不打扰；
 *  - AI 建议排序：high → medium → low。
 * 纯函数、无 I/O、无 DB、无 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  BED_RATE_HIGH,
  CRITICAL_VALUE_HIGH,
  buildHospitalBrain,
  generateAIBrainSuggestion,
  type HospitalBrain,
} from '../../src/bff/aggregators/aiBrainAggregator.js';

/** 构造一个自定义大脑快照（便于阈值触发测试） */
function makeBrain(overrides: Partial<HospitalBrain> = {}): HospitalBrain {
  return {
    generatedAt: '2026-10-16T08:00:00.000Z',
    demo: true,
    dataSource: 'demo',
    hospital: { code: 'HQ', name: '测试医院' },
    outpatient: { inWaiting: 50, todayRegistered: 2400, todayVisited: 1900 },
    inpatient: { inHospital: 900, todayAdmitted: 40, todayDischarged: 38, totalBeds: 1200, bedRate: 75 },
    surgery: { inProgress: 5, completedToday: 20, tomorrowScheduled: 30 },
    warnings: { criticalValues: 0, infection: 0, drugStock: 0, equipmentFault: 0 },
    ...overrides,
  };
}

describe('M156-B 大屏数据 buildHospitalBrain', () => {
  it('四类指标字段齐全且 demo=true', () => {
    const b = buildHospitalBrain(42);
    expect(b.demo).toBe(true);
    expect(b.dataSource).toBe('demo');
    expect(b.outpatient).toBeDefined();
    expect(b.inpatient).toBeDefined();
    expect(b.surgery).toBeDefined();
    expect(b.warnings).toBeDefined();
    expect(typeof b.generatedAt).toBe('string');
  });

  it('固定 seed 可复现：同 seed 两次调用数值完全一致', () => {
    const a = buildHospitalBrain(20261016);
    const b = buildHospitalBrain(20261016);
    expect(a.outpatient).toEqual(b.outpatient);
    expect(a.inpatient).toEqual(b.inpatient);
    expect(a.surgery).toEqual(b.surgery);
    expect(a.warnings).toEqual(b.warnings);
  });

  it('演示计数落在合理区间', () => {
    const b = buildHospitalBrain(7);
    expect(b.outpatient.inWaiting).toBeGreaterThanOrEqual(60);
    expect(b.outpatient.inWaiting).toBeLessThanOrEqual(180);
    expect(b.outpatient.todayRegistered).toBeGreaterThanOrEqual(2400);
    expect(b.inpatient.totalBeds).toBe(1200);
    expect(b.inpatient.bedRate).toBeGreaterThan(0);
    expect(b.inpatient.bedRate).toBeLessThan(100);
    expect(b.surgery.inProgress).toBeGreaterThanOrEqual(6);
    expect(b.surgery.inProgress).toBeLessThanOrEqual(11);
  });

  it('床位使用率 = 在院 / 核定床位 ×100，保留一位小数', () => {
    const b = buildHospitalBrain(99);
    const expected = Math.round((b.inpatient.inHospital / b.inpatient.totalBeds) * 1000) / 10;
    expect(b.inpatient.bedRate).toBe(expected);
  });
});

describe('M156-B 预警生成 generateAIBrainSuggestion', () => {
  it('床位使用率 ≥ 90% → 高优先级住院建议', () => {
    const b = makeBrain({ inpatient: { inHospital: 1150, todayAdmitted: 50, todayDischarged: 20, totalBeds: 1200, bedRate: 95.8 } });
    const list = generateAIBrainSuggestion(b);
    const bed = list.find((s) => s.category === 'inpatient');
    expect(bed).toBeDefined();
    expect(bed?.priority).toBe('high');
    expect(bed?.title).toContain('床位使用率');
    expect(bed?.actions.length).toBeGreaterThanOrEqual(3);
  });

  it('危急值 ≥ 5 → 高优先级预警建议', () => {
    const b = makeBrain({ warnings: { criticalValues: 7, infection: 0, drugStock: 0, equipmentFault: 0 } });
    const list = generateAIBrainSuggestion(b);
    const cv = list.find((s) => s.title.includes('危急值'));
    expect(cv?.priority).toBe('high');
    expect(cv?.message).toContain(String(7));
  });

  it('院感预警 ≥ 2 → 高优先级预警建议', () => {
    const b = makeBrain({ warnings: { criticalValues: 0, infection: 3, drugStock: 0, equipmentFault: 0 } });
    const list = generateAIBrainSuggestion(b);
    const inf = list.find((s) => s.title.includes('院感'));
    expect(inf?.priority).toBe('high');
  });

  it('药品库存 ≥ 3 / 设备故障 ≥ 2 → 中优先级建议', () => {
    const b = makeBrain({
      warnings: { criticalValues: 0, infection: 0, drugStock: 4, equipmentFault: 2 },
    });
    const list = generateAIBrainSuggestion(b);
    expect(list.some((s) => s.title.includes('药品库存') && s.priority === 'medium')).toBe(true);
    expect(list.some((s) => s.title.includes('设备故障') && s.priority === 'medium')).toBe(true);
  });

  it('候诊 ≥ 150 → 低优先级门诊疏导建议', () => {
    const b = makeBrain({ outpatient: { inWaiting: 180, todayRegistered: 2600, todayVisited: 2100 } });
    const list = generateAIBrainSuggestion(b);
    const opd = list.find((s) => s.category === 'outpatient');
    expect(opd?.priority).toBe('low');
  });

  it('平稳工况不打扰：全部低于阈值 → 返回空数组', () => {
    const b = makeBrain();
    const list = generateAIBrainSuggestion(b);
    expect(list.length).toBe(0);
  });

  it('多建议同时命中时按 high → medium → low 排序', () => {
    const b = makeBrain({
      inpatient: { inHospital: 1160, todayAdmitted: 50, todayDischarged: 10, totalBeds: 1200, bedRate: 96.7 },
      warnings: { criticalValues: 6, infection: 2, drugStock: 4, equipmentFault: 2 },
      surgery: { inProgress: 10, completedToday: 20, tomorrowScheduled: 30 },
      outpatient: { inWaiting: 170, todayRegistered: 2600, todayVisited: 2000 },
    });
    const list = generateAIBrainSuggestion(b);
    expect(list.length).toBeGreaterThan(0);
    const rank = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < list.length; i++) {
      expect(rank[list[i].priority]).toBeGreaterThanOrEqual(rank[list[i - 1].priority]);
    }
    expect(list[0].priority).toBe('high');
  });

  it('高水位常量与文档一致', () => {
    expect(BED_RATE_HIGH).toBe(90);
    expect(CRITICAL_VALUE_HIGH).toBe(5);
  });
});
