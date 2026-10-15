/**
 * 健澜科技 jlmedaios - 医疗质量监控纯函数测试（M127-C，管理驾驶舱）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMedicalQualityMonitor,
  judgeIndicator,
  type QualityMonthPoint,
} from '../../src/bff/aggregators/medicalQualityAggregator.js';

/** 构造一个月原始计数的便捷函数 */
function month(over: Partial<QualityMonthPoint> = {}): QualityMonthPoint {
  return {
    month: '2026-10',
    surgeryTotal: 1000,
    surgeryLevel3: 250,
    pathwayTotal: 1000,
    pathwayEnrolled: 500,
    antibioticDdd: 4000,
    patientDays: 10000,
    infectionCases: 50,
    dischargedCount: 1000,
    gradedTotal: 1000,
    recordGradeA: 900,
    criticalTotal: 1000,
    criticalOnTime: 950,
    ...over,
  };
}

describe('judgeIndicator（达标判断）', () => {
  it('越高越好：达标为绿', () => {
    expect(judgeIndicator(95, { value: 90, direction: 'higher' })).toBe('green');
  });
  it('越高越好：落在 ±5% 容差内为黄', () => {
    // target 90, margin 4.5；88 在 [85.5,90) 之间 -> 黄
    expect(judgeIndicator(88, { value: 90, direction: 'higher' })).toBe('yellow');
  });
  it('越高越好：远低于目标为红', () => {
    expect(judgeIndicator(60, { value: 90, direction: 'higher' })).toBe('red');
  });
  it('越低越好：达标为绿', () => {
    // 抗菌药物使用强度 target 40，actual 35 <= 40 -> 绿
    expect(judgeIndicator(35, { value: 40, direction: 'lower' })).toBe('green');
  });
  it('越低越好：略超目标为黄', () => {
    // target 40, margin 2；41 在 (40,42] 之间 -> 黄
    expect(judgeIndicator(41, { value: 40, direction: 'lower' })).toBe('yellow');
  });
  it('越低越好：远超目标为红', () => {
    expect(judgeIndicator(60, { value: 40, direction: 'lower' })).toBe('red');
  });
  it('自定义容差生效', () => {
    expect(judgeIndicator(85, { value: 90, direction: 'higher', tolerance: 0.1 })).toBe('yellow');
  });
});

describe('buildMedicalQualityMonitor（指标计算）', () => {
  it('正确计算六项实际值', () => {
    const m = buildMedicalQualityMonitor({ points: [month()] });
    const byKey = Object.fromEntries(m.indicators.map((i) => [i.key, i]));
    // 三级手术占比 250/1000 = 25
    expect(byKey.level3SurgeryRatio.actual).toBe(25);
    // 临床路径入径率 500/1000 = 50
    expect(byKey.pathwayEnrollRate.actual).toBe(50);
    // 抗菌药物使用强度 4000/10000*100 = 40
    expect(byKey.antibioticIntensity.actual).toBe(40);
    // 院内感染发生率 50/1000 = 5
    expect(byKey.infectionRate.actual).toBe(5);
    // 病历甲级率 900/1000 = 90
    expect(byKey.recordGradeARate.actual).toBe(90);
    // 危急值及时率 950/1000 = 95
    expect(byKey.criticalOnTimeRate.actual).toBe(95);
  });

  it('分母为 0 时安全返回 0，不抛错', () => {
    const m = buildMedicalQualityMonitor({
      points: [month({ surgeryTotal: 0, patientDays: 0 })],
    });
    const byKey = Object.fromEntries(m.indicators.map((i) => [i.key, i]));
    expect(byKey.level3SurgeryRatio.actual).toBe(0);
    expect(byKey.antibioticIntensity.actual).toBe(0);
  });

  it('当前月取末位', () => {
    const m = buildMedicalQualityMonitor({
      points: [month({ month: '2026-09' }), month({ month: '2026-10' })],
    });
    expect(m.currentMonth).toBe('2026-10');
  });
});

describe('趋势分析', () => {
  it('逐月序列与输入点对齐', () => {
    const m = buildMedicalQualityMonitor({
      points: [
        month({ month: '2026-08', surgeryLevel3: 200 }),
        month({ month: '2026-09', surgeryLevel3: 230 }),
        month({ month: '2026-10', surgeryLevel3: 260 }),
      ],
    });
    const ratio = m.indicators.find((i) => i.key === 'level3SurgeryRatio')!;
    expect(ratio.series.map((s) => s.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(ratio.series.map((s) => s.value)).toEqual([20, 23, 26]);
  });

  it('整体灯：全绿为绿', () => {
    const m = buildMedicalQualityMonitor({ points: [month()] });
    expect(m.overall).toBe('green');
    expect(m.counts.green).toBe(6);
  });

  it('整体灯：任一红则红', () => {
    // 病历甲级率 80% < 90 目标 -> 红
    const m = buildMedicalQualityMonitor({
      points: [month({ gradedTotal: 1000, recordGradeA: 800 })],
    });
    expect(m.overall).toBe('red');
    expect(m.counts.red).toBeGreaterThanOrEqual(1);
  });

  it('空输入：currentMonth 为 null，不抛错', () => {
    const m = buildMedicalQualityMonitor({ points: [] });
    expect(m.currentMonth).toBeNull();
    expect(m.indicators.length).toBe(6);
    // 无数据时越高越好类指标实际值为 0，低于目标 -> 整体为红（提示需补数据）
    expect(m.overall).toBe('red');
  });
});
