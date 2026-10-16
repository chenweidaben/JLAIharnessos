/**
 * 健澜科技 jlmedaios - 【安全质量与运营】医院质量与安全管理深化纯函数单测（M172-B）
 *
 * 覆盖：
 *   - 指标扩展：buildDeepQualitySystem 国家口径四维目录（医疗/护理/药事/患者安全）；
 *   - 趋势预测：predictQualityTrend 向好/向坏/平稳/数据不足 + 是否将越线；
 *   - 风险识别：identifyQualityRisk 红线/黄线/达标跳过/零容忍/未登记 code 不参与；
 *   - 改进建议：generateQualityImprovement 缺口/措施规则库/优先级/量化目标。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeepQualitySystem,
  findMetricDef,
  generateQualityImprovement,
  identifyQualityRisk,
  predictQualityTrend,
  QUALITY_METRIC_CATALOG,
} from '../../src/bff/aggregators/qualityDeepAggregator';

describe('buildDeepQualitySystem 国家口径指标扩展', () => {
  it('四维指标齐全：医疗5 / 护理4 / 药事4 / 患者安全5，共18项', () => {
    const sys = buildDeepQualitySystem('2026-10-16T00:00:00Z');
    expect(sys.generatedAt).toBe('2026-10-16T00:00:00Z');
    expect(sys.summary.medical).toBe(5);
    expect(sys.summary.nursing).toBe(4);
    expect(sys.summary.pharmacy).toBe(4);
    expect(sys.summary.patient_safety).toBe(5);
    expect(sys.totalMetrics).toBe(18);
  });

  it('四大维度按序输出，且目录条目数与 summary 一致', () => {
    const sys = buildDeepQualitySystem();
    expect(sys.domains.map((d) => d.code)).toEqual([
      'medical',
      'nursing',
      'pharmacy',
      'patient_safety',
    ]);
    for (const d of sys.domains) {
      expect(d.metrics.length).toBe(sys.summary[d.code]);
    }
  });

  it('国家口径关键指标在册（不自创、不缺项）', () => {
    const codes = QUALITY_METRIC_CATALOG.map((m) => m.code);
    for (const c of [
      'MR_GRADE_A_RATE',
      'SURGICAL_COMPLICATION_RATE',
      'HAI_RATE',
      'AUDDS',
      'PREOP_DISCUSSION_RATE',
      'BASIC_NURSING_PASS_RATE',
      'CRITICAL_NURSING_PASS_RATE',
      'INPATIENT_PRESSURE_ULCER_RATE',
      'INPATIENT_FALL_RATE',
      'PRESCRIPTION_PASS_RATE',
      'ORDER_PASS_RATE',
      'ADR_REPORT_TIMELY_RATE',
      'DRUG_INVENTORY_DIFF_RATE',
      'PS_MEDICATION_ERROR',
      'PS_TRANSFUSION_REACTION',
    ]) {
      expect(codes).toContain(c);
    }
  });

  it('国家达标线：抗菌药物使用强度≤40、处方合格率≥95、术前讨论率=100', () => {
    expect(findMetricDef('AUDDS')?.threshold).toBe(40);
    expect(findMetricDef('AUDDS')?.direction).toBe('lower_better');
    expect(findMetricDef('PRESCRIPTION_PASS_RATE')?.threshold).toBe(95);
    expect(findMetricDef('PREOP_DISCUSSION_RATE')?.threshold).toBe(100);
  });

  it('未登记 code 返回 undefined（禁止自创指标参与计算）', () => {
    expect(findMetricDef('MY_OWN_METRIC_XYZ')).toBeUndefined();
  });
});

describe('predictQualityTrend 趋势预测', () => {
  it('向好：higher_better 持续上升 → improving 且不越线', () => {
    const def = findMetricDef('MR_GRADE_A_RATE')!;
    const r = predictQualityTrend(def, [88, 89.5, 90.2, 91.4, 92.0, 92.5], 3);
    expect(r.trend).toBe('improving');
    expect(r.forecast.length).toBe(3);
    expect(r.forecastEnd).toBeGreaterThan(92.5);
    expect(r.willBreach).toBe(false);
    expect(r.underpowered).toBe(false);
  });

  it('向坏：lower_better 持续上升（抗菌药物使用强度）→ worsening 且将越线', () => {
    const def = findMetricDef('AUDDS')!;
    const r = predictQualityTrend(def, [44, 45.2, 45.8, 46.1, 46.3, 46.5], 3);
    expect(r.trend).toBe('worsening');
    expect(r.forecastEnd).toBeGreaterThan(46.5);
    expect(r.willBreach).toBe(true); // 47.88 远超达标线 40
  });

  it('平稳：序列水平波动 → stable', () => {
    const def = findMetricDef('PRESCRIPTION_PASS_RATE')!;
    const r = predictQualityTrend(def, [95, 95, 95, 95], 3);
    expect(r.trend).toBe('stable');
    expect(r.slopePerPeriod).toBe(0);
    expect(r.willBreach).toBe(false);
  });

  it('数据不足（<2 期）：不外推，标注 underpowered', () => {
    const def = findMetricDef('HAI_RATE')!;
    const r = predictQualityTrend(def, [9.5], 3);
    expect(r.underpowered).toBe(true);
    expect(r.forecast).toEqual([]);
    expect(r.trend).toBe('stable');
  });

  it('支持 {period,value} 对象数组入参', () => {
    const def = findMetricDef('CRITICAL_NURSING_PASS_RATE')!;
    const r = predictQualityTrend(
      def,
      [
        { period: '2026-05', value: 88 },
        { period: '2026-06', value: 87 },
        { period: '2026-07', value: 86.2 },
        { period: '2026-08', value: 85.5 },
      ],
      2,
    );
    expect(r.trend).toBe('worsening'); // higher_better 下降
    expect(r.forecast.length).toBe(2);
  });
});

describe('identifyQualityRisk 风险识别', () => {
  it('红线：lower_better 超达标线 1.5 倍以上（手术并发症 5.4% ≥ 3%×1.5）', () => {
    const risks = identifyQualityRisk('SU', [{ code: 'SURGICAL_COMPLICATION_RATE', value: 5.4 }]);
    expect(risks.length).toBe(1);
    expect(risks[0].level).toBe('critical');
    expect(risks[0].deviation).toBe(2.4);
  });

  it('红线：higher_better 低于达标线 10% 以上（甲级病历率 80% vs 90%）', () => {
    const risks = identifyQualityRisk('SU', [{ code: 'MR_GRADE_A_RATE', value: 80 }]);
    expect(risks[0].level).toBe('critical');
  });

  it('黄线：lower_better 超标但不足 1.5 倍（抗菌药物使用强度 46.5 vs 40）', () => {
    const risks = identifyQualityRisk('IN', [{ code: 'AUDDS', value: 46.5 }]);
    expect(risks[0].level).toBe('warning');
  });

  it('零容忍：患者安全不良事件任何阳性即红线（给药错误 1 例）', () => {
    const risks = identifyQualityRisk('SU', [{ code: 'PS_MEDICATION_ERROR', value: 1 }]);
    expect(risks[0].level).toBe('critical');
    expect(risks[0].domain).toBe('patient_safety');
  });

  it('达标项不进风险清单', () => {
    const risks = identifyQualityRisk('IN', [
      { code: 'MR_GRADE_A_RATE', value: 92.5 }, // ≥90 达标
      { code: 'PS_MEDICATION_ERROR', value: 0 }, // 零容忍，0 达标
    ]);
    expect(risks).toEqual([]);
  });

  it('未登记 code 跳过，不参与判定（防自创指标）', () => {
    const risks = identifyQualityRisk('IN', [{ code: 'MY_OWN_METRIC', value: 999 }]);
    expect(risks).toEqual([]);
  });

  it('风险按严重度排序（critical 在前）', () => {
    const risks = identifyQualityRisk('SU', [
      { code: 'AUDDS', value: 46.5 }, // warning
      { code: 'SURGICAL_COMPLICATION_RATE', value: 5.4 }, // critical
    ]);
    expect(risks[0].code).toBe('SURGICAL_COMPLICATION_RATE');
    expect(risks[1].code).toBe('AUDDS');
  });
});

describe('generateQualityImprovement 改进建议', () => {
  it('抗菌药物使用强度超标：缺口=6.5，命中抗菌药措施规则库，优先级高', () => {
    const def = findMetricDef('AUDDS')!;
    const imp = generateQualityImprovement(def, 46.5);
    expect(imp.gap).toBe(6.5);
    expect(imp.measure).toContain('抗菌');
    expect(imp.owner).toBe('药学部 / 感染科');
    expect(imp.priority).toBe('high');
    expect(imp.target).toContain('40');
  });

  it('患者安全阳性：优先级强制 high', () => {
    const def = findMetricDef('PS_MEDICATION_ERROR')!;
    const imp = generateQualityImprovement(def, 1);
    expect(imp.gap).toBe(1);
    expect(imp.priority).toBe('high');
    expect(imp.measure).toContain('静脉用药');
  });

  it('higher_better 缺口折算：甲级病历率 86% 距 90% 差 4 个百分点', () => {
    const def = findMetricDef('MR_GRADE_A_RATE')!;
    const imp = generateQualityImprovement(def, 86);
    expect(imp.gap).toBe(4);
    expect(imp.priority).toBe('medium'); // 4/90≈4.4% <10%
    expect(imp.target).toContain('≥90%');
  });

  it('达标指标：缺口为 0，优先级 low，仍给出目标', () => {
    const def = findMetricDef('MR_GRADE_A_RATE')!;
    const imp = generateQualityImprovement(def, 92.5);
    expect(imp.gap).toBe(0);
    expect(imp.priority).toBe('low');
  });
});
