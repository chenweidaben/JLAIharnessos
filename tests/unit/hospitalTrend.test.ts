/**
 * 健澜科技 jlmedaios - M127-D 医院运营趋势分析纯函数单测（管理驾驶舱）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildHospitalTrendAnalysis,
  nextMonthOf,
  predictNextMonthVolume,
  type HospitalTrendInput,
} from '../../src/bff/aggregators/hospitalTrendAggregator';

const baseData: HospitalTrendInput = {
  volumes: [
    // 故意乱序，验证内部会按月份升序重排
    { month: '2026-10', outpatientVisits: 10800, inpatientAdmissions: 860 },
    { month: '2026-05', outpatientVisits: 8200, inpatientAdmissions: 640 },
    { month: '2026-06', outpatientVisits: 8600, inpatientAdmissions: 690 },
    { month: '2026-07', outpatientVisits: 9100, inpatientAdmissions: 720 },
    { month: '2026-08', outpatientVisits: 9500, inpatientAdmissions: 760 },
    { month: '2026-09', outpatientVisits: 10200, inpatientAdmissions: 810 },
  ],
  diseases: [
    { name: '高血压', count: 1860, previousCount: 1720 },
    { name: '2型糖尿病', count: 1420, previousCount: 1390 },
    { name: '冠心病', count: 980, previousCount: 1050 },
  ],
  sources: [
    { name: '本市', count: 6800 },
    { name: '外省', count: 1400 },
    { name: '本省外市', count: 2600 },
  ],
};

describe('buildHospitalTrendAnalysis - 门诊量增长趋势', () => {
  const r = buildHospitalTrendAnalysis('近6个月', baseData);

  it('按月份升序重排，不依赖入参顺序', () => {
    expect(r.volumeTrend.months).toEqual([
      '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10',
    ]);
    expect(r.volumeTrend.outpatient).toEqual([8200, 8600, 9100, 9500, 10200, 10800]);
  });

  it('计算最近一月环比增速（10800 vs 10200 ≈ 5.88%）', () => {
    expect(r.volumeTrend.latestMomGrowthPct).toBe(5.88);
  });

  it('持续正增长应判定为上升通道', () => {
    expect(r.volumeTrend.direction).toBe('up');
    expect(r.volumeTrend.avgMonthlyGrowthPct).toBeGreaterThan(2);
  });

  it('空数据返回合法空结构，不抛错', () => {
    const empty = buildHospitalTrendAnalysis('近6个月', {
      volumes: [], diseases: [], sources: [],
    });
    expect(empty.volumeTrend.months).toEqual([]);
    expect(empty.volumeTrend.latestMomGrowthPct).toBeNull();
    expect(empty.diseaseSpectrum).toEqual([]);
  });
});

describe('buildHospitalTrendAnalysis - 疾病谱统计', () => {
  const r = buildHospitalTrendAnalysis('近6个月', baseData);

  it('按例数降序排列', () => {
    expect(r.diseaseSpectrum.map((d) => d.name)).toEqual(['高血压', '2型糖尿病', '冠心病']);
  });

  it('占比合计为 100（按四舍五入近似）', () => {
    const sum = r.diseaseSpectrum.reduce((s, d) => s + d.sharePct, 0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThanOrEqual(101);
  });

  it('有 previousCount 时计算变化率，无则为 null', () => {
    const htn = r.diseaseSpectrum.find((d) => d.name === '高血压')!;
    expect(htn.changePct).toBeCloseTo(8.14, 1);
    const noPrev = buildHospitalTrendAnalysis('x', {
      volumes: [],
      diseases: [{ name: '感冒', count: 10 }],
      sources: [],
    });
    expect(noPrev.diseaseSpectrum[0].changePct).toBeNull();
  });
});

describe('buildHospitalTrendAnalysis - 患者来源分析', () => {
  const r = buildHospitalTrendAnalysis('近6个月', baseData);

  it('按患者数降序排列并给出占比', () => {
    expect(r.patientSources.map((s) => s.name)).toEqual(['本市', '本省外市', '外省']);
    expect(r.patientSources[0].sharePct).toBeCloseTo(62.96, 1);
  });
});

describe('predictNextMonthVolume - 预测逻辑', () => {
  it('上升序列预测值高于末值，且区间包含预测值', () => {
    const p = predictNextMonthVolume([8200, 8600, 9100, 9500, 10200, 10800]);
    expect(p.predictedOutpatient).toBeGreaterThan(10800);
    expect(p.lowerBound).toBeLessThanOrEqual(p.predictedOutpatient);
    expect(p.upperBound).toBeGreaterThanOrEqual(p.predictedOutpatient);
    expect(p.monthlySlope).toBeGreaterThan(0);
    expect(p.note).toBe('基于历史数据估算');
  });

  it('样本不足两点时退化为保守区间，斜率为 0', () => {
    const p = predictNextMonthVolume([1000]);
    expect(p.monthlySlope).toBe(0);
    expect(p.predictedOutpatient).toBe(1000);
    expect(p.upperBound).toBeGreaterThan(1000);
  });

  it('空序列返回 0 且 nextMonth 为 null', () => {
    const p = predictNextMonthVolume([]);
    expect(p.predictedOutpatient).toBe(0);
    expect(p.nextMonth).toBeNull();
  });

  it('预测区间下限不为负', () => {
    const p = predictNextMonthVolume([10, 11, 9, 10, 8]);
    expect(p.lowerBound).toBeGreaterThanOrEqual(0);
  });
});

describe('nextMonthOf', () => {
  it('普通月份递增', () => {
    expect(nextMonthOf('2026-09')).toBe('2026-10');
  });
  it('年末跨年进位', () => {
    expect(nextMonthOf('2026-12')).toBe('2027-01');
  });
});
