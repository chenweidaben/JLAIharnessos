/**
 * 健澜科技 jlmedaios - AI 医院大脑深化纯函数单测（M159-A，中期路线图）
 *
 * 覆盖：
 *  - 智能预警 generateBrainAlert：门诊量大幅下降 → 高严重度预警 + 根因候选
 *    （含「周边新医院开业」类分流原因）；
 *  - 决策建议 generateBrainRecommendation：床位率 ≥95% → 高优先级、
 *    动作含「开放加床」；门诊量下滑 → 引流建议；
 *  - 趋势预测：未来 7 天序列长度 = 7、日期连续、线性外推跟随历史斜率；
 *  - 根因分析 deepHospitalBrain：门诊量下降根因诊断含「周边新医院开业」，
 *    附证据链与置信度；平稳工况不打扰。
 * 纯函数、无 I/O、无 DB、无 WebSocket、无 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  BED_RATE_CRITICAL,
  DEVIATION_HIGH,
  BASELINE_WINDOW,
  FORECAST_HORIZON,
  deepHospitalBrain,
  generateBrainAlert,
  generateBrainRecommendation,
  type DeepMetrics,
  type HistoryPoint,
  // M170-C 新增
  buildExpandedDemo,
  correlateMetrics,
  expandHospitalBrain,
  generateBrainInsight,
  predictMetricTrend,
  type ExpandedMetrics,
  type MetricSeriesPoint,
} from '../../src/bff/aggregators/brainDeepAggregator.js';

/** 构造稳定基线历史：最近 7 天门诊 2400 / 床位率 85 / 手术 22 */
function makeHistory(days = 14, outpatient = 2400, bedRate = 85, surgery = 22): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  const base = new Date(2026, 9, 15); // 2026-10-15 为最后一天
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push({
      date: `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`,
      outpatient,
      bedRate,
      surgery,
    });
  }
  return out;
}

/** 典型异常工况：门诊量下降 25%、床位率 96% 饱和 */
function abnormalMetrics(): DeepMetrics {
  return {
    outpatientToday: 1800, // (1800-2400)/2400 = -25%
    inHospital: 1152,
    totalBeds: 1200,
    bedRate: 96,
    surgeryToday: 22, // 与基线持平
    criticalValuePending: 2,
  };
}

describe('M159-A 智能预警 generateBrainAlert', () => {
  it('门诊量下降 25% → 高严重度预警，根因候选含「周边新医院开业」类分流原因', () => {
    const h = makeHistory();
    const alert = generateBrainAlert('outpatient', -25, h);
    expect(alert.severity).toBe('high');
    expect(alert.deviationPct).toBe(-25);
    expect(alert.expected).toBe(2400);
    expect(alert.observed).toBe(1800);
    expect(alert.likelyCauses.length).toBeGreaterThanOrEqual(3);
    expect(alert.likelyCauses.some((c) => c.includes('周边新开业大型医院'))).toBe(true);
    expect(alert.summary).toContain('门诊量');
  });

  it('床位使用率 96% 突破临界线 → 高严重度（不论偏离幅度）', () => {
    const h = makeHistory();
    // expected=85，observed=96 → 偏离 +11pp，但 observed >= BED_RATE_CRITICAL 直接判高
    const alert = generateBrainAlert('bedRate', 11, h);
    expect(alert.observed).toBe(BED_RATE_CRITICAL + 1);
    expect(alert.severity).toBe('high');
    expect(alert.likelyCauses.some((c) => c.includes('出院低谷'))).toBe(true);
  });

  it('手术量小幅波动 8% → 低严重度，不打扰', () => {
    const h = makeHistory();
    const alert = generateBrainAlert('surgery', 8, h);
    expect(alert.severity).toBe('low');
    expect(alert.title).toContain('手术量');
  });

  it('门诊量上升 22% → 高严重度且根因为高峰类原因', () => {
    const h = makeHistory();
    const alert = generateBrainAlert('outpatient', DEVIATION_HIGH + 2, h);
    expect(alert.severity).toBe('high');
    expect(alert.likelyCauses.some((c) => c.includes('高峰'))).toBe(true);
  });
});

describe('M159-A 决策建议 generateBrainRecommendation', () => {
  it('床位率 96% 饱和 → 高优先级，动作含「开放加床」', () => {
    const rec = generateBrainRecommendation('bedRate', { deviationPct: 11, bedRate: 96 });
    expect(rec.priority).toBe('high');
    expect(rec.suggestedAction).toContain('开放加床');
    expect(rec.expectedBenefit).toContain('床位');
  });

  it('床位率 91% 高位 → 中优先级加床/分流建议', () => {
    const rec = generateBrainRecommendation('bedRate', { deviationPct: 6, bedRate: 91 });
    expect(rec.priority).toBe('medium');
    expect(rec.suggestedAction).toContain('加床');
  });

  it('门诊量下降 25% → 高优先级引流建议', () => {
    const rec = generateBrainRecommendation('outpatient', { deviationPct: -25 });
    expect(rec.priority).toBe('high');
    expect(rec.suggestedAction).toContain('号源投放');
  });

  it('危急值待闭环 ≥5 → 高优先级闭环处置建议', () => {
    const rec = generateBrainRecommendation('outpatient', { deviationPct: 0, criticalValuePending: 6 });
    expect(rec.priority).toBe('high');
    expect(rec.suggestedAction).toContain('闭环');
  });
});

describe('M159-A 趋势预测（未来 7 天门诊量/床位/手术）', () => {
  it('预测序列长度 = 7，日期为历史最后一天连续后移', () => {
    const h = makeHistory();
    const brain = deepHospitalBrain(abnormalMetrics(), h);
    expect(brain.forecast.horizonDays).toBe(FORECAST_HORIZON);
    expect(brain.forecast.series.length).toBe(7);
    expect(brain.forecast.series[0]?.date).toBe('2026-10-16');
    expect(brain.forecast.series[6]?.date).toBe('2026-10-22');
  });

  it('历史恒定 → 预测值平稳跟随基线', () => {
    const h = makeHistory();
    const brain = deepHospitalBrain(abnormalMetrics(), h);
    for (const p of brain.forecast.series) {
      expect(p.outpatient).toBe(2400);
      expect(p.bedRate).toBe(85);
      expect(p.surgery).toBe(22);
    }
  });

  it('历史门诊量逐日下降 → 预测延续下行趋势', () => {
    const declining: HistoryPoint[] = [];
    const base = new Date(2026, 9, 15);
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      declining.push({
        date: `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`,
        outpatient: 2400 - (13 - i) * 10,
        bedRate: 85,
        surgery: 22,
      });
    }
    const brain = deepHospitalBrain(abnormalMetrics(), declining);
    const series = brain.forecast.series.map((p) => p.outpatient);
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i] ?? 0).toBeLessThan(series[i - 1] ?? 0);
    }
  });
});

describe('M159-A 总装 deepHospitalBrain（异常发现 + 根因分析）', () => {
  it('异常工况：产出高严重度门诊预警与加床建议', () => {
    const brain = deepHospitalBrain(abnormalMetrics(), makeHistory());
    expect(brain.demo).toBe(true);
    const outAlert = brain.alerts.find((a) => a.metric === 'outpatient');
    expect(outAlert?.severity).toBe('high');
    expect(brain.recommendations.some((r) => r.suggestedAction.includes('加床'))).toBe(true);
  });

  it('根因分析：门诊量下降根因诊断含「周边新医院开业」并附证据链', () => {
    const brain = deepHospitalBrain(abnormalMetrics(), makeHistory());
    const outCause = brain.rootCauses.find((r) => r.metric === 'outpatient');
    expect(outCause).toBeDefined();
    expect(outCause?.diagnosis).toContain('周边新医院开业');
    expect(outCause?.evidence.length).toBeGreaterThanOrEqual(2);
    expect(outCause?.confidence).toBeGreaterThan(0.5);
    expect(outCause?.confidence).toBeLessThanOrEqual(1);
  });

  it('预警按 high → medium → low 排序', () => {
    const brain = deepHospitalBrain(abnormalMetrics(), makeHistory());
    const rank = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < brain.alerts.length; i += 1) {
      expect(rank[brain.alerts[i]?.severity ?? 'low']).toBeGreaterThanOrEqual(
        rank[brain.alerts[i - 1]?.severity ?? 'low'],
      );
    }
    expect(brain.alerts[0]?.severity).toBe('high');
  });

  it('平稳工况不打扰：指标贴合基线 → 无预警、无根因', () => {
    const brain = deepHospitalBrain(
      { outpatientToday: 2400, inHospital: 1020, totalBeds: 1200, bedRate: 85, surgeryToday: 22, criticalValuePending: 0 },
      makeHistory(),
    );
    expect(brain.alerts.length).toBe(0);
    expect(brain.rootCauses.length).toBe(0);
  });

  it('基线观察窗常量与文档一致', () => {
    expect(BASELINE_WINDOW).toBe(7);
    expect(FORECAST_HORIZON).toBe(7);
    expect(BED_RATE_CRITICAL).toBe(95);
  });
});

// ===========================================================================
// M170-C：四大维度扩展 + 趋势预测 + 关联分析 + 可执行洞察
// ===========================================================================

/** 完全健康的指标（所有子指标达标） */
function healthyExpanded(): ExpandedMetrics {
  return {
    recordA1Rate: 95,
    surgeryComplicationRate: 1.0,
    infectionRate: 1.5,
    bedTurnover: 1.4,
    avgLOS: 8.0,
    avgWaitMinutes: 25,
    satisfaction: 95,
    nps: 50,
    complaintRate: 0.6,
    praiseRate: 3.0,
    revenueWan: 5000,
    costWan: 4500,
    profitWan: 500,
    drgSurplusWan: 20,
  };
}

/** 有问题的指标（M170-C 演示工况） */
function problematicExpanded(): ExpandedMetrics {
  return {
    recordA1Rate: 86.5,
    surgeryComplicationRate: 1.8,
    infectionRate: 1.6,
    bedTurnover: 1.05,
    avgLOS: 9.6,
    avgWaitMinutes: 38,
    satisfaction: 88.4,
    nps: 12,
    complaintRate: 1.6,
    praiseRate: 1.2,
    revenueWan: 4200,
    costWan: 3980,
    profitWan: 220,
    drgSurplusWan: -35,
  };
}

describe('M170-C expandHospitalBrain 四大维度评分', () => {
  it('健康工况：四维评分 ≥ 85，等级为 A', () => {
    const brain = expandHospitalBrain(healthyExpanded());
    expect(brain.brainIndex).toBeGreaterThanOrEqual(85);
    expect(brain.level).toBe('A');
    expect(brain.dimensions).toHaveLength(4);
    for (const d of brain.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(85);
      expect(d.drags.length).toBe(0);
    }
  });

  it('问题工况：DRG 超支 + 平均住院日偏长 + NPS 偏低 → 维度有 risk/warn 且有 drags', () => {
    const brain = expandHospitalBrain(problematicExpanded());
    expect(brain.level).not.toBe('A');
    const fin = brain.dimensions.find((d) => d.key === 'finance');
    expect(fin?.drags.some((x) => x.name === 'DRG 结余')).toBe(true);
    const eff = brain.dimensions.find((d) => d.key === 'efficiency');
    expect(eff?.drags.some((x) => x.name === '平均住院日')).toBe(true);
    const xpr = brain.dimensions.find((d) => d.key === 'experience');
    expect(xpr?.drags.some((x) => x.name === 'NPS')).toBe(true);
  });

  it('结余率 = 利润/收入，且维度键完整', () => {
    const brain = expandHospitalBrain(problematicExpanded());
    // 220 / 4200 ≈ 5.24%
    expect(brain.profitMargin).toBeGreaterThan(4);
    expect(brain.profitMargin).toBeLessThan(6);
    expect(brain.dimensions.map((d) => d.key).sort()).toEqual(['efficiency', 'experience', 'finance', 'quality']);
  });
});

describe('M170-C predictMetricTrend 单指标趋势预测', () => {
  it('线性上升序列 → direction=up，序列逐日升高', () => {
    const hist: MetricSeriesPoint[] = [];
    const base = new Date(2026, 9, 1);
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      hist.push({
        date: `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`,
        value: 100 + i * 5,
      });
    }
    const f = predictMetricTrend('avgLOS', hist, 7);
    expect(f.direction).toBe('up');
    expect(f.series).toHaveLength(7);
    expect(f.series[6]?.value ?? 0).toBeGreaterThan(f.series[0]?.value ?? 0);
    // 完美线性 → R²=1
    expect(f.r2).toBe(1);
  });

  it('平稳序列 → direction=flat', () => {
    const hist: MetricSeriesPoint[] = [];
    for (let i = 0; i < 10; i += 1) {
      hist.push({ date: `2026-10-${`${i + 1}`.padStart(2, '0')}`, value: 50 });
    }
    const f = predictMetricTrend('satisfaction', hist, 5);
    expect(f.direction).toBe('flat');
    expect(f.slopePerDay).toBe(0);
  });

  it('历史过短 → 返回空序列不报错', () => {
    const f = predictMetricTrend('x', [{ date: '2026-10-01', value: 1 }], 7);
    expect(f.series).toHaveLength(0);
    expect(f.direction).toBe('flat');
  });
});

describe('M170-C correlateMetrics 跨指标关联分析', () => {
  it('强反向序列（avgLOS 升、bedTurnover 降）→ r < -0.7 且 implication 含「压缩在院日」', () => {
    const series: Record<string, MetricSeriesPoint[]> = {
      avgLOS: [],
      bedTurnover: [],
    };
    for (let i = 0; i < 14; i += 1) {
      const d = `2026-09-${`${i + 1}`.padStart(2, '0')}`;
      series.avgLOS.push({ date: d, value: 8 + i * 0.1 });
      series.bedTurnover.push({ date: d, value: 1.3 - i * 0.01 });
    }
    const corr = correlateMetrics(series, 14);
    const pair = corr.find((c) => c.a === 'avgLOS' && c.b === 'bedTurnover');
    expect(pair).toBeDefined();
    expect(pair?.r).toBeLessThan(-0.7);
    expect(pair?.implication).toContain('压缩');
  });

  it('无显著关联（|r| < 0.5）→ 返回空数组', () => {
    // 近似随机序列：a=[1,2,3,4,5] 与 b=[3,1,4,1,5] 的皮尔逊 r≈0.35
    const series: Record<string, MetricSeriesPoint[]> = {
      a: [
        { date: '2026-10-01', value: 1 },
        { date: '2026-10-02', value: 2 },
        { date: '2026-10-03', value: 3 },
        { date: '2026-10-04', value: 4 },
        { date: '2026-10-05', value: 5 },
      ],
      b: [
        { date: '2026-10-01', value: 3 },
        { date: '2026-10-02', value: 1 },
        { date: '2026-10-03', value: 4 },
        { date: '2026-10-04', value: 1 },
        { date: '2026-10-05', value: 5 },
      ],
    };
    const corr = correlateMetrics(series, 30);
    expect(corr).toHaveLength(0);
  });
});

describe('M170-C generateBrainInsight 可执行洞察（不是「建议关注」）', () => {
  it('问题工况：DRG 超支 → 高优先级洞察，action 含「病案」且 expectedImpact 量化', () => {
    const { metrics, history } = buildExpandedDemo();
    const corr = correlateMetrics(history, 14);
    const insights = generateBrainInsight(metrics, corr);
    const drg = insights.find((i) => i.id === 'INS-F-DRG');
    expect(drg).toBeDefined();
    expect(drg?.priority).toBe('high');
    expect(drg?.action).toContain('病案');
    // 量化收益必须含数字
    expect(drg?.expectedImpact).toMatch(/\d/);
  });

  it('问题工况：平均住院日 9.6 天 → 洞察含「日间手术」', () => {
    const { metrics, history } = buildExpandedDemo();
    const insights = generateBrainInsight(metrics, correlateMetrics(history, 14));
    const los = insights.find((i) => i.id === 'INS-E-LOS');
    expect(los?.action).toContain('日间手术');
  });

  it('健康工况：无洞察（不打扰）', () => {
    const insights = generateBrainInsight(healthyExpanded(), []);
    expect(insights).toHaveLength(0);
  });

  it('洞察按 high → medium → low 排序', () => {
    const { metrics, history } = buildExpandedDemo();
    const insights = generateBrainInsight(metrics, correlateMetrics(history, 14));
    const w = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < insights.length; i += 1) {
      expect(w[insights[i]?.priority ?? 'low']).toBeGreaterThanOrEqual(w[insights[i - 1]?.priority ?? 'low']);
    }
    expect(insights[0]?.priority).toBe('high');
  });

  it('每条洞察都有 action 与 expectedImpact（不允许「建议关注」式空话）', () => {
    const { metrics, history } = buildExpandedDemo();
    const insights = generateBrainInsight(metrics, correlateMetrics(history, 14));
    for (const ins of insights) {
      expect(ins.action.length).toBeGreaterThan(5);
      expect(ins.expectedImpact.length).toBeGreaterThan(5);
      expect(ins.expectedImpact).toMatch(/\d/);
    }
  });
});
