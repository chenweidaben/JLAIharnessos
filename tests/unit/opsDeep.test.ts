/**
 * 健澜科技 jlmedaios — 【安全质量与运营】医院运营与管理深化纯函数单测（M172-C）
 *
 * 覆盖：buildDeepOperationSystem（四域体系蓝图）、
 *       analyzeOperationEfficiency（派生指标/四域加权评分/等级）、
 *       benchmarkOperation（逐项对标 领先/持平/落后）、
 *       identifyOperationBottleneck（红线阈值扫描/严重度/改进建议）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzeOperationEfficiency,
  benchmarkOperation,
  buildDeepOperationSystem,
  deriveOpsMetrics,
  identifyOperationBottleneck,
  type RawOpsMetrics,
} from '../../src/bff/aggregators/opsDeepAggregator';

/** 一个内科科室的真实运营量（2000 床、日门诊 1 万规模三甲） */
const deptRaw: RawOpsMetrics = {
  outpatientVisits: 96000, avgCostPerVisit: 320, avgWaitMinutes: 34, appointmentRate: 0.42, noShowRate: 0.13,
  inHospital: 186, admissions: 720, discharges: 708, avgLOS: 9.6, bedOccupancy: 0.93, totalBeds: 200,
  surgeryCount: 260, highLevelSurgery: 91, surgeryWaitHours: 40, pacuTurnover: 3.2,
  revenue: 58000000, cost: 55100000, profit: 2900000, drgSurplus: -120000, insuranceDenialRate: 0.025,
};

/** 全院均值标杆（整体略优于科室） */
const benchRaw: RawOpsMetrics = {
  outpatientVisits: 100000, avgCostPerVisit: 300, avgWaitMinutes: 22, appointmentRate: 0.55, noShowRate: 0.09,
  inHospital: 190, admissions: 760, discharges: 755, avgLOS: 8.4, bedOccupancy: 0.9, totalBeds: 200,
  surgeryCount: 300, highLevelSurgery: 135, surgeryWaitHours: 24, pacuTurnover: 4.1,
  revenue: 62000000, cost: 58300000, profit: 3700000, drgSurplus: 260000, insuranceDenialRate: 0.009,
};

describe('buildDeepOperationSystem（运营管理体系蓝图）', () => {
  it('输出门诊/住院/手术/财务四域，每域带指标口径与管理目标', () => {
    const sys = buildDeepOperationSystem();
    expect(sys.domains.map((d) => d.key).sort())
      .toEqual(['finance', 'inpatient', 'outpatient', 'surgery']);
    for (const d of sys.domains) {
      expect(d.metrics.length).toBeGreaterThan(0);
      expect(d.managementGoal.length).toBeGreaterThan(0);
    }
    expect(sys.principles.join('|')).toContain('不拍脑袋');
  });
});

describe('deriveOpsMetrics（派生效率指标实时算）', () => {
  it('三四级占比 = 三四级手术量 / 手术量；利润率 = 利润 / 收入', () => {
    const d = deriveOpsMetrics(deptRaw);
    expect(d.highLevelRatio).toBeCloseTo(91 / 260, 2);
    expect(d.profitMargin).toBeCloseTo(2900000 / 58000000, 3);
    expect(d.costRatio).toBeCloseTo(55100000 / 58000000, 3);
  });

  it('分母为 0 时安全返回 0，不抛异常', () => {
    const d = deriveOpsMetrics({ ...deptRaw, surgeryCount: 0, revenue: 0 });
    expect(d.highLevelRatio).toBe(0);
    expect(d.profitMargin).toBe(0);
  });
});

describe('analyzeOperationEfficiency（运营效率加权评分）', () => {
  it('四域得分都在 0~100，整体等级属于 A/B/C/D', () => {
    const r = analyzeOperationEfficiency({ deptCode: 'im', deptName: '内科' }, '2026-09', deptRaw);
    expect(r.domains).toHaveLength(4);
    for (const d of r.domains) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D']).toContain(d.grade);
    }
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(100);
  });

  it('效率差的科室得分低于效率好的科室', () => {
    const bad = analyzeOperationEfficiency({ deptCode: 'a', deptName: '差科室' }, '2026-09', {
      ...deptRaw, avgWaitMinutes: 60, avgLOS: 15, profit: -5000000, insuranceDenialRate: 0.06,
      surgeryWaitHours: 60, highLevelSurgery: 20,
    });
    const good = analyzeOperationEfficiency({ deptCode: 'b', deptName: '好科室' }, '2026-09', benchRaw);
    expect(good.overallScore).toBeGreaterThan(bad.overallScore);
  });
});

describe('benchmarkOperation（标杆对标）', () => {
  it('科室多项指标弱于标杆 → 落后项多于领先项，整体评级落后', () => {
    const r = benchmarkOperation({ deptCode: 'im', deptName: '内科' }, deptRaw, benchRaw);
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.laggingCount).toBeGreaterThan(r.leadingCount);
    expect(r.overallRating).toBe('lagging');
    const wait = r.items.find((i) => i.metricKey === 'avgWaitMinutes')!;
    expect(wait.rating).toBe('lagging');
  });

  it('科室优于标杆 → 领先', () => {
    const r = benchmarkOperation({ deptCode: 'x', deptName: '优科室' }, benchRaw, deptRaw);
    const wait = r.items.find((i) => i.metricKey === 'avgWaitMinutes')!;
    expect(wait.rating).toBe('leading');
  });
});

describe('identifyOperationBottleneck（红线瓶颈识别）', () => {
  it('识别出 DRG 超支为红线瓶颈，候诊/手术等待/医保拒付为关注项', () => {
    const r = identifyOperationBottleneck({ deptCode: 'im', deptName: '内科' }, deptRaw);
    expect(r.criticalCount).toBeGreaterThanOrEqual(1);
    expect(r.topBottleneck?.severity).toBe('critical');
    expect(r.bottlenecks.find((b) => b.metricKey === 'drgSurplus')).toBeDefined();
    expect(r.bottlenecks.find((b) => b.metricKey === 'avgWaitMinutes')).toBeDefined();
    expect(r.bottlenecks.find((b) => b.metricKey === 'surgeryWaitHours')).toBeDefined();
    expect(r.bottlenecks.find((b) => b.metricKey === 'insuranceDenialRate')).toBeDefined();
  });

  it('健康科室无红线瓶颈', () => {
    const healthy: RawOpsMetrics = {
      ...deptRaw, avgWaitMinutes: 18, noShowRate: 0.06, appointmentRate: 0.6,
      bedOccupancy: 0.9, avgLOS: 7.5, highLevelSurgery: 150, surgeryWaitHours: 18,
      pacuTurnover: 4.5, profit: 6000000, insuranceDenialRate: 0.005, drgSurplus: 300000,
    };
    const r = identifyOperationBottleneck({ deptCode: 'h', deptName: '健康科室' }, healthy);
    expect(r.criticalCount).toBe(0);
    expect(r.topBottleneck).toBeNull();
  });

  it('亏损科室识别出利润率红线', () => {
    const r = identifyOperationBottleneck({ deptCode: 'l', deptName: '亏损科室' }, {
      ...deptRaw, profit: -8000000,
    });
    const p = r.bottlenecks.find((b) => b.metricKey === 'profitMargin');
    expect(p?.severity).toBe('critical');
  });
});
