/**
 * 健澜科技 jlmedaios - 管理驾驶舱（院长驾驶舱）纯函数测试（M127-A）
 *
 * 覆盖：十大指标聚合（比率换算 + 健康度）、近 30 天趋势归一化与环比、空数据兜底。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildHospitalDashboard } from '../../src/bff/aggregators/hospitalDashboardAggregator.js';

describe('buildHospitalDashboard - 指标聚合', () => {
  it('汇总十大核心指标', () => {
    const view = buildHospitalDashboard({
      todayOutpatient: 10246,
      inpatientCurrent: 1812,
      inpatientAdmitted: 132,
      inpatientDischarged: 118,
      surgeryCompleted: 96,
      surgeryScheduled: 100,
      emergencyCount: 218,
      avgWaitingMinutes: 18,
      bedOccupied: 1500,
      bedTotal: 2000,
      drugIncome: 800,
      medicalTotalIncome: 2000,
      satisfactionSatisfied: 950,
      satisfactionSurveyed: 1000,
      medicalQualityScore: 93.5,
      systemIntelligence: 87,
    });
    expect(view.metrics).toHaveLength(10);

    const byKey = Object.fromEntries(view.metrics.map((m) => [m.key, m]));
    // 床位使用率 = 1500/2000 = 75%
    expect(byKey.bedUsageRate.value).toBe(75);
    // 药占比 = 800/2000 = 40%
    expect(byKey.drugCostRatio.value).toBe(40);
    // 患者满意度 = 950/1000 = 95%
    expect(byKey.patientSatisfaction.value).toBe(95);
    // 手术完成率 = 96/100 = 96%
    expect(byKey.surgeryCount.detail).toContain('完成率 96%');
  });

  it('健康度阈值：候诊 30 分钟预警、床位 75% 正常、药占比 40% 预警', () => {
    const view = buildHospitalDashboard({
      avgWaitingMinutes: 30,
      bedOccupied: 1500,
      bedTotal: 2000,
      drugIncome: 800,
      medicalTotalIncome: 2000,
    });
    const byKey = Object.fromEntries(view.metrics.map((m) => [m.key, m]));
    expect(byKey.avgWaitingMinutes.status).toBe('warn');
    expect(byKey.bedUsageRate.status).toBe('good'); // 75% 为良好边界
    expect(byKey.drugCostRatio.status).toBe('warn'); // 40% 落在 35-45%
  });

  it('分母为 0 时比率安全为 0，不产生 NaN', () => {
    const view = buildHospitalDashboard({
      bedOccupied: 100,
      bedTotal: 0,
      satisfactionSatisfied: 90,
      satisfactionSurveyed: 0,
    });
    const byKey = Object.fromEntries(view.metrics.map((m) => [m.key, m]));
    expect(Number.isNaN(byKey.bedUsageRate.value)).toBe(false);
    expect(byKey.bedUsageRate.value).toBe(0);
    expect(byKey.patientSatisfaction.value).toBe(0);
  });
});

describe('buildHospitalDashboard - 趋势计算', () => {
  it('趋势序列归一化为近 30 天', () => {
    const view = buildHospitalDashboard({
      trendOutpatient: [1, 2, 3],
      trendInpatient: [10, 20],
      trendSatisfaction: [90, 91, 92, 93],
    });
    expect(view.trend.outpatient).toHaveLength(30);
    expect(view.trend.inpatient).toHaveLength(30);
    expect(view.trend.satisfaction).toHaveLength(30);
    // 末尾保留真实最新值
    expect(view.trend.outpatient[29]).toBe(3);
  });

  it('环比统计：latest 与相对 7 天前 changePct', () => {
    const out = new Array(30).fill(0);
    out[22] = 100; // 7 天前
    out[29] = 110; // 最新
    const view = buildHospitalDashboard({ trendOutpatient: out });
    expect(view.trendStats.outpatient.latest).toBe(110);
    expect(view.trendStats.outpatient.prev).toBe(100);
    expect(view.trendStats.outpatient.changePct).toBe(10); // (110-100)/100
  });

  it('7 天前为 0 时环比安全为 0，不产生 Infinity', () => {
    const view = buildHospitalDashboard({
      trendOutpatient: [0, 0, 50], // 归一化后 prev7 落在补零区
    });
    expect(Number.isFinite(view.trendStats.outpatient.changePct)).toBe(true);
    expect(view.trendStats.outpatient.changePct).toBe(0);
  });
});

describe('buildHospitalDashboard - 空数据兜底', () => {
  it('无入参时返回十张零值指标卡与全零趋势', () => {
    const view = buildHospitalDashboard();
    expect(view.metrics).toHaveLength(10);
    for (const m of view.metrics) {
      expect(m.value).toBe(0);
      expect(Number.isFinite(m.value)).toBe(true);
    }
    expect(view.trend.outpatient).toHaveLength(30);
    expect(view.trend.outpatient.every((v) => v === 0)).toBe(true);
    expect(view.trendStats.outpatient.changePct).toBe(0);
    expect(view.demo).toBe(false);
  });
});
