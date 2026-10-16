/**
 * 健澜科技 jlmedaios — 【质量与体验】医院运营分析深化纯函数单测（M180-B）
 *
 * 覆盖：buildDeepOperationAnalysis（四域蓝图/分析口径）、
 *       analyzeOperationTrend（多期斜率/变化率/up/down/flat 过滤）、
 *       benchmarkOperation（逐项对标 领先/持平/落后）、
 *       predictOperationTrend（线性回归外推/置信区间/R²/数据不足跳过）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzeOperationTrend,
  benchmarkOperation,
  buildDeepOperationAnalysis,
  predictOperationTrend,
  type DeptRef,
  type PeriodMetricSnapshot,
} from '../../src/bff/aggregators/opsAnalysisAggregator';

/** 构造 6 期历史：门诊量单调递增，次均费用平稳，等待时间下降 */
function buildHistory(): PeriodMetricSnapshot[] {
  const periods = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  return periods.map((p, i) => ({
    period: p,
    metrics: {
      outpatient_visits: 90000 + i * 2000,       // 单调上升
      avg_cost_per_visit: 310,                   // 平稳
      avg_wait_minutes: 40 - i * 3,              // 下降（向好）
      appointment_rate: 0.4 + i * 0.01,
      no_show_rate: 0.14,
      in_hospital: 180 + i * 2,
      admissions: 700 + i * 10,
      discharges: 690 + i * 10,
      avg_los: 9.9 - i * 0.2,
      bed_occupancy: 0.9,
      surgery_count: 250 + i * 5,
      high_level_surgery: 80 + i * 3,
      surgery_wait_hours: 44 - i * 2,
      pacu_turnover: 3.0 + i * 0.1,
      revenue: 55000000 + i * 1000000,
      cost: 52000000 + i * 500000,
      profit: 2000000 + i * 400000,
      drg_surplus: -200000 + i * 50000,
      insurance_denial_rate: 0.028,
    },
  }));
}

const deptRef: DeptRef = { deptCode: 'internal_medicine', deptName: '内科', history: buildHistory() };

describe('buildDeepOperationAnalysis（运营分析蓝图）', () => {
  it('输出门诊/住院/手术/财务四域与三类分析', () => {
    const bp = buildDeepOperationAnalysis();
    expect(bp.domains.map((d) => d.key).sort())
      .toEqual(['finance', 'inpatient', 'outpatient', 'surgery']);
    for (const d of bp.domains) {
      expect(d.metrics.length).toBeGreaterThan(0);
    }
    expect(bp.analyses.map((a) => a.key).sort())
      .toEqual(['benchmark', 'forecast', 'trend']);
    expect(bp.principles.join('|')).toContain('不能拍脑袋');
  });
});

describe('analyzeOperationTrend（运营趋势分析）', () => {
  it('识别上升/下降/平稳，summary 计数正确', () => {
    const r = analyzeOperationTrend(deptRef, '2026-09', 'all');
    expect(r.metricCount).toBeGreaterThan(0);
    const visits = r.metrics.find((m) => m.metricKey === 'outpatient_visits');
    expect(visits?.trend).toBe('up');
    expect(visits?.changePct).toBeGreaterThan(0);
    expect(visits?.slope).toBeGreaterThan(0);
    const cost = r.metrics.find((m) => m.metricKey === 'avg_cost_per_visit');
    expect(cost?.trend).toBe('flat');
    const wait = r.metrics.find((m) => m.metricKey === 'avg_wait_minutes');
    expect(wait?.trend).toBe('down');
    expect(r.summary.up + r.summary.down + r.summary.flat).toBe(r.metricCount);
  });

  it('trendType=up 只返回上升指标', () => {
    const r = analyzeOperationTrend(deptRef, '2026-09', 'up');
    expect(r.metrics.length).toBeGreaterThan(0);
    for (const m of r.metrics) expect(m.trend).toBe('up');
  });

  it('历史不足 2 期时不硬判趋势', () => {
    const one: DeptRef = { deptCode: 'x', deptName: '新科室', history: [{ period: '2026-09', metrics: { outpatient_visits: 100 } }] };
    const r = analyzeOperationTrend(one, '2026-09', 'all');
    expect(r.metrics.length).toBe(0);
  });
});

describe('benchmarkOperation（运营对标）', () => {
  it('按指标方向评级：预约率高于标杆=领先，等待时间高于标杆=落后', () => {
    const current = {
      outpatient_visits: 100000, avg_cost_per_visit: 320, avg_wait_minutes: 34,
      appointment_rate: 0.6, no_show_rate: 0.1, bed_occupancy: 0.9,
    };
    const benchmark = {
      outpatient_visits: 100000, avg_cost_per_visit: 300, avg_wait_minutes: 22,
      appointment_rate: 0.55, no_show_rate: 0.09, bed_occupancy: 0.9,
    };
    const r = benchmarkOperation(deptRef, { current, benchmark });
    const appt = r.items.find((i) => i.metricKey === 'appointment_rate');
    expect(appt?.rating).toBe('leading');
    const wait = r.items.find((i) => i.metricKey === 'avg_wait_minutes');
    expect(wait?.rating).toBe('lagging');
    expect(['leading', 'on_par', 'lagging']).toContain(r.overallRating);
  });

  it('标杆值为 0 时跳过该指标，不除零', () => {
    const r = benchmarkOperation(deptRef, {
      current: { outpatient_visits: 100, avg_cost_per_visit: 10 },
      benchmark: { outpatient_visits: 0, avg_cost_per_visit: 10 },
    });
    expect(r.items.find((i) => i.metricKey === 'outpatient_visits')).toBeUndefined();
  });
});

describe('predictOperationTrend（运营预测）', () => {
  it('对有 ≥3 期历史的指标外推未来 N 期，含置信区间与 R²', () => {
    const r = predictOperationTrend(deptRef, '2026-09', 3);
    expect(r.days).toBe(3);
    expect(r.metrics.length).toBeGreaterThan(0);
    const visits = r.metrics.find((m) => m.metricKey === 'outpatient_visits');
    expect(visits).toBeDefined();
    expect(visits!.forecasts).toHaveLength(3);
    for (const f of visits!.forecasts) {
      expect(f.lowerBound).toBeLessThanOrEqual(f.value);
      expect(f.upperBound).toBeGreaterThanOrEqual(f.value);
      expect(f.targetPeriod).toBeTruthy();
    }
    expect(visits!.confidence).toBeGreaterThanOrEqual(0);
    expect(visits!.confidence).toBeLessThanOrEqual(1);
  });

  it('外推周期正确：2026-09 → 2026-10/11/12', () => {
    const r = predictOperationTrend(deptRef, '2026-09', 3);
    const visits = r.metrics.find((m) => m.metricKey === 'outpatient_visits');
    expect(visits?.forecasts.map((f) => f.targetPeriod)).toEqual(['2026-10', '2026-11', '2026-12']);
  });

  it('历史不足 3 期的指标跳过并在 note 说明', () => {
    const short: DeptRef = {
      deptCode: 'new', deptName: '新科室',
      history: [
        { period: '2026-08', metrics: { outpatient_visits: 100 } },
        { period: '2026-09', metrics: { outpatient_visits: 110 } },
      ],
    };
    const r = predictOperationTrend(short, '2026-09', 3);
    expect(r.metrics.length).toBe(0);
    expect(r.note).toContain('不足 3 期');
  });

  it('days 被截断到 [1,24]', () => {
    const r = predictOperationTrend(deptRef, '2026-09', 99);
    expect(r.days).toBe(24);
  });
});
