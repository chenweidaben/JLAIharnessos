/**
 * 健澜科技 jlmedaios - 系统智能度聚合器纯函数单测（M119-D，依据宪法第七章）
 *
 * 仅覆盖纯函数：指标聚合（rateOf / buildSystemIntelligenceDashboard）、
 * 趋势计算、告警判断（checkAlerts），不触碰 IO / 时钟。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildSystemIntelligenceDashboard,
  checkAlerts,
  DEFAULT_INTELLIGENCE_THRESHOLDS,
  rateOf,
  type IntelligenceRawMetrics,
} from '../../src/bff/aggregators/systemIntelligenceAggregator';

/** 构造一份「全部达标、无历史」的基准快照，各用例按需覆写 */
function base(overrides: Partial<IntelligenceRawMetrics> = {}): IntelligenceRawMetrics {
  return {
    demo: false,
    llm: { total: 100, success: 95 }, // 95%
    recommendations: { total: 100, adopted: 60, modified: 20 }, // (60+10)/100 = 70%
    qa: { total: 100, correct: 90 }, // 90%
    coverage: { total: 100, covered: 80 }, // 80%
    history: [],
    ...overrides,
  };
}

describe('rateOf', () => {
  it('分母 ≤ 0 返回 0，不除零', () => {
    expect(rateOf(10, 0)).toBe(0);
    expect(rateOf(10, -5)).toBe(0);
  });

  it('正常折算并保留 4 位小数', () => {
    expect(rateOf(1, 3)).toBeCloseTo(0.3333, 3);
  });

  it('clamp 到 [0,1]', () => {
    expect(rateOf(120, 100)).toBe(1);
    expect(rateOf(-5, 10)).toBe(0);
  });
});

describe('buildSystemIntelligenceDashboard 指标聚合', () => {
  it('四项比率正确折算（建议采纳 modified 按半权计入）', () => {
    const d = buildSystemIntelligenceDashboard(base(), DEFAULT_INTELLIGENCE_THRESHOLDS, 'cur', 'NOW');
    expect(d.llmSuccessRate).toBe(0.95);
    // (60 + 20*0.5)/100 = 0.70
    expect(d.recommendationAdoptionRate).toBe(0.7);
    expect(d.qaAccuracy).toBe(0.9);
    expect(d.coverageRate).toBe(0.8);
  });

  it('样本量透传，generatedAt / period 注入', () => {
    const d = buildSystemIntelligenceDashboard(base(), DEFAULT_INTELLIGENCE_THRESHOLDS, 'W42', 'ISO_NOW');
    expect(d.sampleSizes).toEqual({
      llmCalls: 100,
      recommendations: 100,
      qaSamples: 100,
      coverageScenarios: 100,
    });
    expect(d.generatedAt).toBe('ISO_NOW');
  });

  it('趋势序列 = history 末尾追加当前周期点', () => {
    const withHist = base({
      history: [
        { period: 'W40', llmSuccessRate: 0.9, recommendationAdoptionRate: 0.65, qaAccuracy: 0.88, coverageRate: 0.75 },
        { period: 'W41', llmSuccessRate: 0.92, recommendationAdoptionRate: 0.68, qaAccuracy: 0.89, coverageRate: 0.78 },
      ],
    });
    const d = buildSystemIntelligenceDashboard(withHist, DEFAULT_INTELLIGENCE_THRESHOLDS, 'W42');
    expect(d.trends).toHaveLength(3);
    expect(d.trends[0].period).toBe('W40');
    expect(d.trends[2].period).toBe('W42');
    expect(d.trends[2].llmSuccessRate).toBe(0.95);
  });

  it('冷启动（全 0）比率全部为 0，不抛错', () => {
    const d = buildSystemIntelligenceDashboard(
      base({
        llm: { total: 0, success: 0 },
        recommendations: { total: 0, adopted: 0, modified: 0 },
        qa: { total: 0, correct: 0 },
        coverage: { total: 0, covered: 0 },
      }),
    );
    expect(d.llmSuccessRate).toBe(0);
    expect(d.qaAccuracy).toBe(0);
  });
});

describe('checkAlerts 告警判断', () => {
  it('全部达标、无历史 → 无告警', () => {
    expect(checkAlerts(base())).toEqual([]);
  });

  it('绝对值跌破 warning 线 → warning', () => {
    // 大模型成功率 88% < warn 90%，但 ≥ crit 80%
    const alerts = checkAlerts(base({ llm: { total: 100, success: 88 } }));
    const llm = alerts.find((a) => a.key === 'llmSuccessRate');
    expect(llm?.severity).toBe('warning');
    expect(llm?.current).toBe(0.88);
  });

  it('绝对值跌破 critical 红线 → critical', () => {
    // 问答准确率 65% < crit 70%
    const alerts = checkAlerts(base({ qa: { total: 100, correct: 65 } }));
    const qa = alerts.find((a) => a.key === 'qaAccuracy');
    expect(qa?.severity).toBe('critical');
  });

  it('环比骤降 ≥10pp → critical；下降 ≥5pp → warning', () => {
    // 上周期建议采纳率 0.80，现值 0.62 → 降 18pp
    const crit = checkAlerts(
      base({
        recommendations: { total: 100, adopted: 52, modified: 20 }, // 现值 0.62
        history: [
          { period: 'W41', llmSuccessRate: 0.95, recommendationAdoptionRate: 0.8, qaAccuracy: 0.9, coverageRate: 0.8 },
        ],
      }),
    );
    const rec = crit.find((a) => a.key === 'recommendationAdoptionRate');
    expect(rec?.severity).toBe('critical');

    // 上周期覆盖率 0.82，现值 0.76 → 降 6pp → warning
    const warn = checkAlerts(
      base({
        coverage: { total: 100, covered: 76 },
        history: [
          { period: 'W41', llmSuccessRate: 0.95, recommendationAdoptionRate: 0.7, qaAccuracy: 0.9, coverageRate: 0.82 },
        ],
      }),
    );
    const cov = warn.find((a) => a.key === 'coverageRate');
    expect(cov?.severity).toBe('warning');
  });

  it('环比下降幅度 <5pp → 不告警', () => {
    const alerts = checkAlerts(
      base({
        llm: { total: 100, success: 93 }, // 现值 93%
        history: [
          { period: 'W41', llmSuccessRate: 0.95, recommendationAdoptionRate: 0.7, qaAccuracy: 0.9, coverageRate: 0.8 },
        ],
      }),
    );
    expect(alerts.find((a) => a.key === 'llmSuccessRate')).toBeUndefined();
  });

  it('critical 排在 warning 之前', () => {
    const alerts = checkAlerts(
      base({
        llm: { total: 100, success: 88 }, // warning
        qa: { total: 100, correct: 60 }, // critical
      }),
    );
    expect(alerts[0].severity).toBe('critical');
  });

  it('阈值可注入覆盖', () => {
    // 放宽 llm crit 到 0.95，则 95% 不告警；收紧到 0.96 则 95% 命中 warning
    const alerts = checkAlerts(base(), {
      ...DEFAULT_INTELLIGENCE_THRESHOLDS,
      llmWarn: 0.96,
    });
    expect(alerts.find((a) => a.key === 'llmSuccessRate')?.severity).toBe('warning');
  });
});
