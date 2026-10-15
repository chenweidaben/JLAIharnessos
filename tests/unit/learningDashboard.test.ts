/**
 * 健澜科技 jlmedaios - 学习引擎监控看板纯函数单测
 *
 * 覆盖：buildLearningDashboard（采纳率日聚合 / 权重分布合并归一 /
 *       知识累计增长 / 画像覆盖率）、trend（今日 vs 昨日）、空数据兜底。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildLearningDashboard,
  trend,
  type FeedbackRow,
  type KnowledgeState,
  type StrategyRow,
} from '../../src/bff/aggregators/learningDashboardAggregator';

describe('trend：今日 vs 昨日', () => {
  it('环比上升：delta 与 pctChange 正确折算', () => {
    // 0.5 -> 0.6
    expect(trend([0.5, 0.6])).toEqual({ delta: 0.1, pctChange: 0.2 });
  });

  it('环比下降：delta 为负、pctChange 按绝对值基准', () => {
    // 0.8 -> 0.6：delta -0.2，pctChange = -0.2/0.8 = -0.25
    expect(trend([0.8, 0.6])).toEqual({ delta: -0.2, pctChange: -0.25 });
  });

  it('样本不足两项（无昨日）兜底为 0', () => {
    expect(trend([])).toEqual({ delta: 0, pctChange: 0 });
    expect(trend([0.7])).toEqual({ delta: 0, pctChange: 0 });
  });

  it('昨日为 0：今日>0 记 +1（从无到有），今日也为 0 记 0', () => {
    expect(trend([0, 5])).toEqual({ delta: 5, pctChange: 1 });
    expect(trend([0, 0])).toEqual({ delta: 0, pctChange: 0 });
  });
});

describe('buildLearningDashboard', () => {
  const feedback: FeedbackRow[] = [
    // D1：采纳 3 + 修改 1(半权) / 4 = 0.875
    { suggestionType: 'diagnosis', decision: 'adopted', createdAt: '2026-10-13T09:00:00Z' },
    { suggestionType: 'diagnosis', decision: 'adopted', createdAt: '2026-10-13T09:05:00Z' },
    { suggestionType: 'drug', decision: 'adopted', createdAt: '2026-10-13T10:00:00Z' },
    { suggestionType: 'drug', decision: 'modified', createdAt: '2026-10-13T10:05:00Z' },
    // D2：采纳 1 / 2 = 0.5
    { suggestionType: 'diagnosis', decision: 'adopted', createdAt: '2026-10-14T09:00:00Z' },
    { suggestionType: 'pathway', decision: 'rejected', createdAt: '2026-10-14T11:00:00Z' },
  ];

  const strategies: StrategyRow[] = [
    { weights: { diagnosis: 0.5, drug: 0.3, pathway: 0.2 }, active: true },
    // 未激活版本不参与权重分布
    { weights: { diagnosis: 0.99 }, active: false },
  ];

  const knowledge: KnowledgeState = {
    entries: [
      { createdAt: '2026-10-12T08:00:00Z' },
      { createdAt: '2026-10-13T08:00:00Z' },
      { createdAt: '2026-10-13T09:00:00Z' },
      { createdAt: '2026-10-14T08:00:00Z' },
    ],
    coverageSeries: [
      { date: '2026-10-13', profiled: 50, total: 100, rate: 0.5 },
      { date: '2026-10-14', profiled: 80, total: 100, rate: 0.8 },
    ],
  };

  it('采纳率：按日归组并复用 (采纳+0.5*修改)/总数 口径', () => {
    const d = buildLearningDashboard(feedback, strategies, knowledge);
    expect(d.adoptionRate.series).toHaveLength(2);
    expect(d.adoptionRate.series[0].date).toBe('2026-10-13');
    expect(d.adoptionRate.series[0].rate).toBeCloseTo(0.875, 5);
    // D2：1 条 adopted + 1 条 rejected = 0.5
    expect(d.adoptionRate.series[1].rate).toBeCloseTo(0.5, 5);
    expect(d.adoptionRate.current).toBeCloseTo(0.5, 5);
    // 0.875 -> 0.5：delta -0.375
    expect(d.adoptionRate.trend.delta).toBeCloseTo(-0.375, 3);
  });

  it('权重分布：仅激活版本参与，合并后归一、按权重降序', () => {
    const d = buildLearningDashboard(feedback, strategies, knowledge);
    expect(d.weightDistribution.slices.map((s) => s.type)).toEqual(['diagnosis', 'drug', 'pathway']);
    expect(d.weightDistribution.slices[0].weight).toBeCloseTo(0.5, 4);
    const sum = d.weightDistribution.slices.reduce((acc, s) => acc + s.weight, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it('知识增长：逐日累计，序列日期升序、total=条目总数', () => {
    const d = buildLearningDashboard(feedback, strategies, knowledge);
    expect(d.knowledgeGrowth.total).toBe(4);
    expect(d.knowledgeGrowth.series.map((p) => p.count)).toEqual([1, 3, 4]);
    expect(d.knowledgeGrowth.trend.delta).toBe(1);
  });

  it('画像覆盖率：取序列末点，今日 vs 昨日趋势正确', () => {
    const d = buildLearningDashboard(feedback, strategies, knowledge);
    expect(d.patientProfileCoverage.profiled).toBe(80);
    expect(d.patientProfileCoverage.total).toBe(100);
    expect(d.patientProfileCoverage.rate).toBeCloseTo(0.8, 4);
    // 0.5 -> 0.8：delta +0.3，pctChange = 0.3/0.5 = 0.6
    expect(d.patientProfileCoverage.trend.delta).toBeCloseTo(0.3, 4);
    expect(d.patientProfileCoverage.trend.pctChange).toBeCloseTo(0.6, 4);
  });

  it('空数据兜底：全部为空输入时四张图返回零值/空序列，不抛错', () => {
    const d = buildLearningDashboard([], [], { entries: [], coverageSeries: [] });
    expect(d.adoptionRate).toEqual({ series: [], current: 0, trend: { delta: 0, pctChange: 0 } });
    expect(d.weightDistribution.slices).toEqual([]);
    expect(d.knowledgeGrowth).toEqual({ series: [], total: 0, trend: { delta: 0, pctChange: 0 } });
    expect(d.patientProfileCoverage).toEqual({ profiled: 0, total: 0, rate: 0, trend: { delta: 0, pctChange: 0 } });
  });

  it('total=0 时画像覆盖率兜底为 0，避免除零', () => {
    const d = buildLearningDashboard([], [], {
      entries: [],
      coverageSeries: [{ date: '2026-10-14', profiled: 0, total: 0, rate: 0 }],
    });
    expect(d.patientProfileCoverage.rate).toBe(0);
  });

  it('不修改入参', () => {
    const fbSnapshot = feedback.map((r) => ({ ...r }));
    buildLearningDashboard(feedback, strategies, knowledge);
    expect(feedback).toEqual(fbSnapshot);
  });
});
