/**
 * 健澜科技 jlmedaios - 运营规律洞察纯函数单测
 *
 * 覆盖：computeDeviation（百分比偏差/除零保护）、
 *       detectAnomaly（2σ 异常检测：正常序列/尖峰/短序列/恒值序列）、
 *       buildOperationalInsight（异常卡片 / 星期周期卡片 / 趋势卡片）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildOperationalInsight,
  computeDeviation,
  detectAnomaly,
  type CurrentMetric,
  type MetricPoint,
} from '../../src/bff/aggregators/operationalInsightAggregator';

describe('computeDeviation', () => {
  it('以预期值为基准的百分比偏差：偏高为正、偏低为负', () => {
    expect(computeDeviation(110, 100)).toBe(10);
    expect(computeDeviation(90, 100)).toBe(-10);
  });

  it('保留 2 位小数', () => {
    expect(computeDeviation(100.345, 100)).toBeCloseTo(0.35, 1);
  });

  it('预期值为 0 时返回 0，不产生 Infinity', () => {
    expect(computeDeviation(120, 0)).toBe(0);
  });
});

describe('detectAnomaly（2σ 异常检测）', () => {
  it('波动正常的序列末点不判异常', () => {
    expect(detectAnomaly([100, 102, 98, 101, 99, 100])).toBe(false);
  });

  it('末点远超 ±2σ 控制带判异常', () => {
    // 历史 [100,102,98,101,99] μ=100 σ≈1.41，末点 150 偏离 50 > 2σ
    expect(detectAnomaly([100, 102, 98, 101, 99, 150])).toBe(true);
  });

  it('样本不足 3 点不判异常（冷启动保护）', () => {
    expect(detectAnomaly([100, 500])).toBe(false);
  });

  it('序列几乎恒值（σ≈0）时不判异常，避免误报', () => {
    expect(detectAnomaly([100, 100, 100, 100, 100, 150])).toBe(false);
  });
});

describe('buildOperationalInsight', () => {
  it('尖峰当前读数产出 anomaly 卡片，偏差口径正确', () => {
    const history: MetricPoint[] = [
      { date: '2026-10-05', value: 100 },
      { date: '2026-10-06', value: 102 },
      { date: '2026-10-07', value: 98 },
      { date: '2026-10-08', value: 101 },
      { date: '2026-10-09', value: 99 },
      { date: '2026-10-10', value: 100 },
      { date: '2026-10-11', value: 103 },
      { date: '2026-10-12', value: 97 },
      { date: '2026-10-13', value: 100 },
      { date: '2026-10-14', value: 98 },
    ];
    const current: CurrentMetric = { metricName: 'outpatient_visits', date: '2026-10-15', value: 150 };
    const insights = buildOperationalInsight(history, current);
    const anomaly = insights.find((i) => i.kind === 'anomaly');
    expect(anomaly).toBeDefined();
    expect(anomaly?.metricName).toBe('outpatient_visits');
    expect(anomaly?.currentValue).toBe(150);
    expect(anomaly?.deviationPct).toBeGreaterThan(40);
    expect(anomaly?.aiAnalysis.length).toBeGreaterThan(0);
    expect(anomaly?.suggestedAction.length).toBeGreaterThan(0);
  });

  it('工作日高/周末低的稳定模式产出 seasonality 周期卡片', () => {
    // 14 天：10 个工作日≈1000，4 个周末≈600
    const history: MetricPoint[] = [
      { date: '2026-10-01', value: 1000 }, // 四
      { date: '2026-10-02', value: 1010 }, // 五
      { date: '2026-10-03', value: 600 },  // 六
      { date: '2026-10-04', value: 595 },  // 日
      { date: '2026-10-05', value: 995 },  // 一
      { date: '2026-10-06', value: 1005 }, // 二
      { date: '2026-10-07', value: 1000 }, // 三
      { date: '2026-10-08', value: 1002 }, // 四
      { date: '2026-10-09', value: 998 },  // 五
      { date: '2026-10-10', value: 605 },  // 六
      { date: '2026-10-11', value: 598 },  // 日
      { date: '2026-10-12', value: 1008 }, // 一
      { date: '2026-10-13', value: 996 },  // 二
      { date: '2026-10-14', value: 1004 },  // 三
    ];
    const current: CurrentMetric = { metricName: 'outpatient_visits', date: '2026-10-15', value: 1005 };
    const insights = buildOperationalInsight(history, current);
    const seasonal = insights.find((i) => i.kind === 'seasonality');
    expect(seasonal).toBeDefined();
    // 周期预期 = 历史两个周四（10-01 / 10-08）均值 ≈ 1001
    expect(seasonal?.expectedValue).toBeCloseTo(1001, 0);
    // 符合周期规律时当前读数不应再触发 anomaly 卡片
    expect(insights.find((i) => i.kind === 'anomaly')).toBeUndefined();
  });

  it('单调上升序列产出 trend 趋势卡片', () => {
    const history: MetricPoint[] = [
      { date: '2026-10-08', value: 100 },
      { date: '2026-10-09', value: 108 },
      { date: '2026-10-10', value: 121 },
      { date: '2026-10-11', value: 129 },
      { date: '2026-10-12', value: 142 },
      { date: '2026-10-13', value: 151 },
      { date: '2026-10-14', value: 159 },
    ];
    const current: CurrentMetric = { metricName: 'avg_wait_minutes', date: '2026-10-15', value: 170 };
    const insights = buildOperationalInsight(history, current);
    const trend = insights.find((i) => i.kind === 'trend');
    expect(trend).toBeDefined();
    expect(trend?.expectedValue).toBeGreaterThan(159); // 趋势外推：末值+斜率
  });

  it('不修改入参历史序列', () => {
    const history: MetricPoint[] = [
      { date: '2026-10-08', value: 100 },
      { date: '2026-10-09', value: 102 },
      { date: '2026-10-10', value: 98 },
      { date: '2026-10-11', value: 101 },
      { date: '2026-10-12', value: 99 },
      { date: '2026-10-13', value: 100 },
      { date: '2026-10-14', value: 103 },
    ];
    const snapshot = history.map((p) => ({ ...p }));
    buildOperationalInsight(history, { metricName: 'm', date: '2026-10-15', value: 105 });
    expect(history).toEqual(snapshot);
  });
});
