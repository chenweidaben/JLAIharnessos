/**
 * 健澜科技 jlmedaios - 系统智慧度评分聚合器纯函数单测（M133-D）
 *
 * 覆盖：
 *  - 评分计算：六维折算、加权求和、总分精度；
 *  - 趋势聚合：getIntelligenceTrend 的 delta/avg/best/worst；
 *  - 阈值判断：等级划分、弱项维度识别、空样本不抛错。
 *
 * 仅测纯函数，不触碰 IO / 时钟。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  calculateSystemIntelligenceScore,
  getIntelligenceTrend,
  tierOf,
  WEAK_DIMENSION_THRESHOLD,
  type IntelligenceMetrics,
} from '../../src/bff/aggregators/intelligenceScoreAggregator';

/** 一份「全部 80 分位」的基准快照，各用例按需覆写 */
function base(overrides: Partial<IntelligenceMetrics> = {}): IntelligenceMetrics {
  return {
    experienceEntries: 400, // 400/500 = 80
    recommendationAdopted: 600,
    recommendationModified: 200, // (600+100)/1000 = 70
    recommendationTotal: 1000,
    learningActivities: 160, // 160/200 = 80
    knowledgeCovered: 80, // 80/100 = 80
    knowledgeTotal: 100,
    automatedTasks: 800, // 800/1000 = 80
    totalTasks: 1000,
    satisfactionPositive: 800, // 800/1000 = 80
    satisfactionTotal: 1000,
    ...overrides,
  };
}

describe('calculateSystemIntelligenceScore 评分计算', () => {
  it('六维权重之和 = 100%', () => {
    const s = calculateSystemIntelligenceScore('h1', base(), 'NOW');
    const sum = s.dimensions.reduce((acc, d) => acc + d.weight, 0);
    expect(sum).toBe(100);
  });

  it('基准快照下总分落在合理区间（70-85）', () => {
    const s = calculateSystemIntelligenceScore('h1', base(), 'NOW');
    // 维度分：经验 80 / 采纳 70 / 学习 80 / 知识 80 / 自动 80 / 满意 80
    // 加权：80*.2 + 70*.2 + 80*.15 + 80*.15 + 80*.15 + 80*.15 = 78
    expect(s.totalScore).toBeCloseTo(78, 0);
    expect(s.dimensions).toHaveLength(6);
  });

  it('每维明细包含原始输入、公式与加权贡献', () => {
    const s = calculateSystemIntelligenceScore('h1', base(), 'NOW');
    const rec = s.dimensions.find((d) => d.key === 'recommendationAdoption');
    expect(rec).toBeDefined();
    expect(rec?.weight).toBe(20);
    expect(rec?.score).toBeCloseTo(70, 0);
    expect(rec?.formula).toContain('直接采纳 600');
    expect(rec?.raw).toEqual({ adopted: 600, modified: 200, total: 1000 });
    // 加权贡献 = 70 * 0.2 = 14
    expect(rec?.weightedContribution).toBeCloseTo(14, 0);
  });

  it('计数类维度饱和截顶：超过目标值记 100 分', () => {
    const s = calculateSystemIntelligenceScore(
      'h1',
      base({ experienceEntries: 9999, learningActivities: 9999 }),
      'NOW',
    );
    const exp = s.dimensions.find((d) => d.key === 'experienceAccumulation');
    const learn = s.dimensions.find((d) => d.key === 'learningEngineActivity');
    expect(exp?.score).toBe(100);
    expect(learn?.score).toBe(100);
  });

  it('比率类维度分母为 0 时返回 0，不抛错', () => {
    const s = calculateSystemIntelligenceScore(
      'h1',
      base({
        recommendationTotal: 0,
        knowledgeTotal: 0,
        totalTasks: 0,
        satisfactionTotal: 0,
      }),
      'NOW',
    );
    expect(s.dimensions.find((d) => d.key === 'recommendationAdoption')?.score).toBe(0);
    expect(s.dimensions.find((d) => d.key === 'knowledgeCoverage')?.score).toBe(0);
    expect(s.dimensions.find((d) => d.key === 'automationRate')?.score).toBe(0);
    expect(s.dimensions.find((d) => d.key === 'userSatisfaction')?.score).toBe(0);
  });

  it('冷启动（全 0）总分 = 0，等级 = 待提升', () => {
    const zero: IntelligenceMetrics = {
      experienceEntries: 0,
      recommendationAdopted: 0,
      recommendationModified: 0,
      recommendationTotal: 0,
      learningActivities: 0,
      knowledgeCovered: 0,
      knowledgeTotal: 0,
      automatedTasks: 0,
      totalTasks: 0,
      satisfactionPositive: 0,
      satisfactionTotal: 0,
    };
    const s = calculateSystemIntelligenceScore('h1', zero, 'NOW', true);
    expect(s.totalScore).toBe(0);
    expect(s.tier).toBe('weak');
    expect(s.tierLabel).toBe('待提升');
    expect(s.demo).toBe(true);
    expect(s.hospitalId).toBe('h1');
    expect(s.generatedAt).toBe('NOW');
  });
});

describe('tierOf 等级阈值', () => {
  it('>=90 卓越 / >=80 优秀 / >=70 良好 / >=60 合格 / <60 待提升', () => {
    expect(tierOf(95).tier).toBe('outstanding');
    expect(tierOf(85).tier).toBe('excellent');
    expect(tierOf(75).tier).toBe('good');
    expect(tierOf(65).tier).toBe('pass');
    expect(tierOf(55).tier).toBe('weak');
  });

  it('边界值：60.0 合格、59.9 待提升', () => {
    expect(tierOf(60).tier).toBe('pass');
    expect(tierOf(59.9).tier).toBe('weak');
  });
});

describe('弱项维度识别', () => {
  it(`得分 < ${WEAK_DIMENSION_THRESHOLD} 标记为弱项并进入 weakDimensions`, () => {
    // 把自动化率打到 30%
    const s = calculateSystemIntelligenceScore(
      'h1',
      base({ automatedTasks: 300, totalTasks: 1000 }),
      'NOW',
    );
    const auto = s.dimensions.find((d) => d.key === 'automationRate');
    expect(auto?.score).toBeCloseTo(30, 0);
    expect(auto?.isWeak).toBe(true);
    expect(s.weakDimensions.find((d) => d.key === 'automationRate')).toBeDefined();
  });

  it('全部 >= 60 时 weakDimensions 为空', () => {
    const s = calculateSystemIntelligenceScore('h1', base(), 'NOW');
    // 基准快照里推荐采纳 70、其余 80，均 >= 60
    expect(s.weakDimensions).toEqual([]);
  });
});

describe('getIntelligenceTrend 趋势聚合', () => {
  it('空历史返回合法空结构，不抛错', () => {
    const t = getIntelligenceTrend('h1', 30, []);
    expect(t.points).toEqual([]);
    expect(t.delta).toBe(0);
    expect(t.avgScore).toBe(0);
    expect(t.bestScore).toBe(0);
    expect(t.worstScore).toBe(0);
  });

  it('多日快照：逐日算分并聚合 delta/avg/best/worst', () => {
    const history = [
      { date: '2026-10-01', metrics: base({ experienceEntries: 200 }) }, // 经验 40 分
      { date: '2026-10-02', metrics: base({ experienceEntries: 300 }) }, // 经验 60 分
      { date: '2026-10-03', metrics: base({ experienceEntries: 400 }) }, // 经验 80 分（=base）
    ];
    const t = getIntelligenceTrend('h1', 3, history);
    expect(t.points).toHaveLength(3);
    expect(t.points[0].date).toBe('2026-10-01');
    // 首日：经验 40*.2 + 采纳 70*.2 + 学习 80*.15 + 知识 80*.15 + 自动 80*.15 + 满意 80*.15
    //     = 8 + 14 + 12 + 12 + 12 + 12 = 70
    expect(t.points[0].score).toBeCloseTo(70, 0);
    // 末日 = base 总分 = 78
    expect(t.points[2].score).toBeCloseTo(78, 0);
    // delta = 78 - 70 = 8
    expect(t.delta).toBeCloseTo(8, 0);
    // avg = (70 + 74 + 78)/3 = 74
    expect(t.avgScore).toBeCloseTo(74, 0);
    expect(t.bestScore).toBeCloseTo(78, 0);
    expect(t.worstScore).toBeCloseTo(70, 0);
  });

  it('趋势点携带等级标签', () => {
    const t = getIntelligenceTrend('h1', 1, [
      { date: '2026-10-03', metrics: base() },
    ]);
    expect(t.points[0].tier).toBe('good'); // 78 → 良好
  });
});
