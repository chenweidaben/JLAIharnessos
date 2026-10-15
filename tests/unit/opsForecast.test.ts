/**
 * 健澜科技 jlmedaios — 【AI深化与运营预测】运营预测纯函数单测（M154-C）
 *
 * 覆盖：forecastOutpatientVolume（门诊预测/置信区间/降级）、
 *       forecastBedOccupancy（床位预测/区间包含）、
 *       calculateForecastAccuracy（MAE/MAPE/RMSE/区间命中率）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  calculateForecastAccuracy,
  forecastBedOccupancy,
  forecastOutpatientVolume,
  type ForecastPoint,
  type HistoryPoint,
  MIN_HISTORY_DAYS,
} from '../../src/bff/aggregators/opsForecastAggregator';

/** 从某起始日生成 n 天序列：工作日高、周末低，叠加轻微上升趋势 */
function genHistory(n: number, start: string, base: number, weekendDrop: number, trendStep: number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  const startDate = new Date(start + 'T00:00:00Z');
  for (let i = 0; i < n; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const wd = d.getUTCDay(); // 0=周日 6=周六
    const weekend = wd === 0 || wd === 6;
    const noise = (i % 3) * 5; // 小波动，制造残差
    const value = base + trendStep * i - (weekend ? weekendDrop : 0) + noise;
    out.push({ date: d.toISOString().slice(0, 10), value });
  }
  return out;
}

describe('forecastOutpatientVolume（门诊预测）', () => {
  const history = genHistory(28, '2026-09-01', 1000, 400, 5);

  it('历史充足时产出未来 7 天预测，长度与区间合法', () => {
    const r = forecastOutpatientVolume(history, 7);
    expect(r.degraded).toBe(false);
    expect(r.historyPoints).toBe(28);
    expect(r.forecast).toHaveLength(7);
    // 预测首日 = 历史末日 + 1 天
    expect(r.forecast[0].date).toBe('2026-09-29');
    for (const p of r.forecast) {
      expect(p.lower).toBeLessThanOrEqual(p.value);
      expect(p.value).toBeLessThanOrEqual(p.upper);
      expect(p.lower).toBeGreaterThanOrEqual(0);
    }
  });

  it('置信区间随预测步长变宽（外推越远不确定性越大）', () => {
    const r = forecastOutpatientVolume(history, 7);
    const w0 = r.forecast[0].upper - r.forecast[0].lower;
    const w6 = r.forecast[6].upper - r.forecast[6].lower;
    expect(w6).toBeGreaterThan(w0);
  });

  it('门诊量为整数人次', () => {
    const r = forecastOutpatientVolume(history, 3);
    for (const p of r.forecast) {
      expect(Number.isInteger(p.value)).toBe(true);
    }
  });

  it('历史样本不足 14 天时降级空集，不编造', () => {
    const short = genHistory(MIN_HISTORY_DAYS - 1, '2026-09-01', 1000, 400, 5);
    const r = forecastOutpatientVolume(short, 7);
    expect(r.degraded).toBe(true);
    expect(r.forecast).toHaveLength(0);
    expect(r.historyPoints).toBe(0);
  });
});

describe('forecastBedOccupancy（床位负荷预测）', () => {
  const history = genHistory(21, '2026-09-05', 120, 20, 2);

  it('产出预测且点值落在置信区间内', () => {
    const r = forecastBedOccupancy(history, 5);
    expect(r.degraded).toBe(false);
    expect(r.forecast).toHaveLength(5);
    for (const p of r.forecast) {
      expect(p.lower).toBeLessThanOrEqual(p.value);
      expect(p.value).toBeLessThanOrEqual(p.upper);
    }
  });

  it('保留 1 位小数', () => {
    const r = forecastBedOccupancy(history, 2);
    for (const p of r.forecast) {
      expect(Math.abs(p.value * 10 - Math.round(p.value * 10))).toBeLessThan(1e-9);
    }
  });
});

describe('calculateForecastAccuracy（准确率回测）', () => {
  const forecast: ForecastPoint[] = [
    { date: '2026-10-01', value: 100, lower: 90, upper: 110 },
    { date: '2026-10-02', value: 100, lower: 88, upper: 112 },
    { date: '2026-10-03', value: 100, lower: 86, upper: 114 },
  ];
  // 实际：95（区间内，误差-5）、120（区间外，误差+20）、100（区间内，误差0）
  const actual: HistoryPoint[] = [
    { date: '2026-10-01', value: 95 },
    { date: '2026-10-02', value: 120 },
    { date: '2026-10-03', value: 100 },
    { date: '2026-10-04', value: 999 }, // 无配对，应被忽略
  ];

  it('MAE / RMSE / MAPE / 区间命中率口径正确', () => {
    const acc = calculateForecastAccuracy(forecast, actual);
    expect(acc.samples).toBe(3);
    // |−5|, |+20|, |0| → MAE = 25/3 ≈ 8.33
    expect(acc.mae).toBeCloseTo(8.33, 1);
    // RMSE = sqrt((25+400+0)/3) = sqrt(141.67) ≈ 11.90
    expect(acc.rmse).toBeCloseTo(11.9, 1);
    // MAPE = (5/95 + 20/120 + 0/100)/3 ≈ 7.6%
    expect(acc.mape).toBeGreaterThan(5);
    expect(acc.mape).toBeLessThan(10);
    // 3 个里 2 个落在区间内 → 66.67%
    expect(acc.withinIntervalPct).toBeCloseTo(66.67, 1);
  });

  it('无配对样本时返回零值（samples=0）', () => {
    const acc = calculateForecastAccuracy(forecast, [{ date: '2099-01-01', value: 1 }]);
    expect(acc.samples).toBe(0);
    expect(acc.mae).toBe(0);
  });
});
