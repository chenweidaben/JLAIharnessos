/**
 * 健澜科技 jlmedaios - 推荐策略自学习纯函数单测（越用越聪明深化）
 *
 * 覆盖：
 *   - autoOptimizeRecommendations：高采纳率升权 / 低采纳率降权 / 中间区间不动、
 *     单次幅度封顶 ±20% / 权重截断 [0.1, 3.0] / 新场景样本足后自动上线 /
 *     样本不足保持 pending / 空数据兜底 / 不修改入参；
 *   - compareStrategyBeforeAfter：窗口首日 vs 最新一次的逐类型变化与总偏移；
 *   - getSelfLearningLog：按时间窗口过滤与倒序排序。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  ADOPTED_HIGH,
  ADOPTED_LOW,
  MAX_ADJUST_RATIO,
  MAX_WEIGHT,
  MIN_WEIGHT,
  autoOptimizeRecommendations,
  compareStrategyBeforeAfter,
  getSelfLearningLog,
  type WeightLogRow,
  type WeightMap,
} from '../../src/bff/aggregators/selfLearningAggregator';

describe('autoOptimizeRecommendations 调整方向', () => {
  const base: WeightMap = { diagnosis: 1.0, drug: 1.0, pathway: 1.0 };

  it('采纳率 > 0.7 的类型权重提升（高采纳率升权）', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: base,
      typeFeedback: { diagnosis: { adopted: 8, rejected: 2 } }, // 0.8
    });
    // adj = min(0.2, 0.8-0.7=0.1) = +0.1 → 1.0*1.1 = 1.1
    expect(r.weights.diagnosis).toBeCloseTo(1.1, 3);
    // 无反馈类型保持不动
    expect(r.weights.drug).toBeCloseTo(1.0, 3);
    expect(r.weights.pathway).toBeCloseTo(1.0, 3);
  });

  it('采纳率 < 0.3 的类型权重下降（低采纳率降权）', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: base,
      typeFeedback: { pathway: { adopted: 2, rejected: 8 } }, // 0.2
    });
    // adj = -min(0.2, 0.3-0.2=0.1) = -0.1 → 1.0*0.9 = 0.9
    expect(r.weights.pathway).toBeCloseTo(0.9, 3);
  });

  it('采纳率落在 [0.3, 0.7] 区间保持不动', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: base,
      typeFeedback: { drug: { adopted: 5, rejected: 5 } }, // 0.5
    });
    expect(r.weights.drug).toBeCloseTo(1.0, 3);
  });

  it('无反馈时权重全部保持不动、状态 held', () => {
    const r = autoOptimizeRecommendations('s1', { currentWeights: base });
    expect(r.weights).toEqual(base);
    expect(r.log.status).toBe('held');
    expect(r.log.adjustmentRatio).toBe(0);
  });

  it('不修改入参', () => {
    const snapshot = { ...base };
    autoOptimizeRecommendations('s1', {
      currentWeights: base,
      typeFeedback: { diagnosis: { adopted: 9, rejected: 1 } },
    });
    expect(base).toEqual(snapshot);
  });
});

describe('autoOptimizeRecommendations 单次幅度 ±20% 封顶（自学习可控）', () => {
  it('采纳率极高(1.0)时升权幅度封顶 +20%，不超调', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: { diagnosis: 1.0 },
      typeFeedback: { diagnosis: { adopted: 10, rejected: 0 } }, // 1.0
    });
    // adj = min(0.2, 1.0-0.7=0.3) = +0.2 → 1.2
    expect(r.weights.diagnosis).toBeCloseTo(1.2, 3);
    expect(r.log.adjustmentRatio).toBeLessThanOrEqual(MAX_ADJUST_RATIO + 1e-9);
  });

  it('采纳率极低(0.0)时降权幅度封顶 -20%', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: { pathway: 1.0 },
      typeFeedback: { pathway: { adopted: 0, rejected: 10 } }, // 0.0
    });
    // adj = -min(0.2, 0.3-0.0=0.3) = -0.2 → 0.8
    expect(r.weights.pathway).toBeCloseTo(0.8, 3);
  });
});

describe('autoOptimizeRecommendations 权重截断 [0.1, 3.0]', () => {
  it('高权重升权后超过上界 3.0 时截断到 3.0', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: { heavy: 3.0 },
      typeFeedback: { heavy: { adopted: 10, rejected: 0 } }, // ×1.2 = 3.6 → 截断 3.0
    });
    expect(r.weights.heavy).toBe(MAX_WEIGHT);
  });

  it('低权重降权后低于下界 0.1 时截断到 0.1', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: { light: 0.1 },
      typeFeedback: { light: { adopted: 0, rejected: 10 } }, // ×0.8 = 0.08 → 截断 0.1
    });
    expect(r.weights.light).toBe(MIN_WEIGHT);
  });
});

describe('autoOptimizeRecommendations 新场景自动上线', () => {
  it('样本足(≥30)且采纳率健康(≥0.5)的新场景自动上线，初始权重 1.0', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: { diagnosis: 1.0 },
      typeFeedback: {},
      scenarioSamples: {
        imaging: { samples: 40, adopted: 28, rejected: 12 }, // rate 0.7, 样本足
      },
    });
    expect(r.weights.imaging).toBe(1.0);
    expect(r.pendingScenarios[0].autoOnline).toBe(true);
    expect(r.log.status).toBe('applied');
  });

  it('样本不足的新场景保持 pending，不上线', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: { diagnosis: 1.0 },
      typeFeedback: {},
      scenarioSamples: {
        rare: { samples: 10, adopted: 7, rejected: 3 }, // rate 0.7 但样本不足
      },
    });
    expect(r.weights.rare).toBeUndefined();
    expect(r.pendingScenarios[0].autoOnline).toBe(false);
    expect(r.pendingScenarios[0].samples).toBe(10);
  });

  it('样本足但采纳率不达标(<0.5)的新场景保持 pending', () => {
    const r = autoOptimizeRecommendations('s1', {
      currentWeights: { diagnosis: 1.0 },
      typeFeedback: {},
      scenarioSamples: {
        weak: { samples: 50, adopted: 10, rejected: 40 }, // rate 0.2
      },
    });
    expect(r.weights.weak).toBeUndefined();
    expect(r.pendingScenarios[0].autoOnline).toBe(false);
  });
});

describe('autoOptimizeRecommendations 空数据兜底', () => {
  it('空权重分布返回空对象、零偏移、无反馈', () => {
    const r = autoOptimizeRecommendations('empty', {});
    expect(r.weights).toEqual({});
    expect(r.log.acceptedDelta).toBe(0);
    expect(r.log.rejectedDelta).toBe(0);
    expect(r.log.adoptedRate).toBe(0);
  });
});

describe('compareStrategyBeforeAfter', () => {
  const now = new Date('2026-10-16T00:00:00Z').getTime();
  const mk = (
    createdAt: string,
    newWeights: WeightMap,
  ): WeightLogRow => ({
    strategyId: 's1',
    runDate: createdAt.slice(0, 10),
    oldWeights: {},
    newWeights,
    adoptedCount: 0,
    rejectedCount: 0,
    adoptedRate: 0,
    adjustmentRatio: 0,
    status: 'applied',
    createdAt,
  });

  it('对比窗口首日 vs 最新一次的逐类型变化与总偏移', () => {
    const rows = [
      mk('2026-10-10T00:00:00Z', { a: 1.0, b: 1.0 }),
      mk('2026-10-15T00:00:00Z', { a: 1.2, b: 0.9 }),
    ];
    const c = compareStrategyBeforeAfter('s1', 30, rows, now);
    expect(c.samples).toBe(2);
    expect(c.before).toEqual({ a: 1.0, b: 1.0 });
    expect(c.after).toEqual({ a: 1.2, b: 0.9 });
    expect(c.changes.a.change).toBeCloseTo(0.2, 4);
    expect(c.changes.a.pct).toBeCloseTo(0.2, 4);
    expect(c.changes.b.change).toBeCloseTo(-0.1, 4);
    expect(c.totalUp).toBeCloseTo(0.2, 4);
    expect(c.totalDown).toBeCloseTo(0.1, 4);
  });

  it('无窗口数据时返回空对比、零偏移', () => {
    const c = compareStrategyBeforeAfter('s1', 30, [], now);
    expect(c.samples).toBe(0);
    expect(c.before).toEqual({});
    expect(c.after).toEqual({});
    expect(c.totalUp).toBe(0);
    expect(c.totalDown).toBe(0);
  });

  it('只统计匹配 strategyId 的留痕', () => {
    const rows = [
      mk('2026-10-10T00:00:00Z', { a: 1.0 }),
      { ...mk('2026-10-15T00:00:00Z', { a: 1.5 }), strategyId: 'other' },
    ];
    const c = compareStrategyBeforeAfter('s1', 30, rows, now);
    expect(c.samples).toBe(1);
    expect(c.after).toEqual({ a: 1.0 });
  });
});

describe('getSelfLearningLog', () => {
  const now = new Date('2026-10-16T00:00:00Z').getTime();
  const mk = (createdAt: string): WeightLogRow => ({
    strategyId: 's1',
    runDate: createdAt.slice(0, 10),
    oldWeights: { a: 1.0 },
    newWeights: { a: 1.1 },
    adoptedCount: 8,
    rejectedCount: 2,
    adoptedRate: 0.8,
    adjustmentRatio: 0.1,
    status: 'applied',
    createdAt,
  });

  it('按最近 N 天窗口过滤，窗口外条目剔除', () => {
    const rows = [
      mk('2026-10-15T00:00:00Z'), // 1 天内
      mk('2026-10-01T00:00:00Z'), // 15 天前，超出 7 天窗口
    ];
    const logs = getSelfLearningLog({ days: 7 }, rows, now);
    expect(logs.length).toBe(1);
    expect(logs[0].runDate).toBe('2026-10-15');
  });

  it('结果按时间倒序返回（新的在前）', () => {
    const rows = [
      mk('2026-10-10T00:00:00Z'),
      mk('2026-10-15T00:00:00Z'),
      mk('2026-10-12T00:00:00Z'),
    ];
    const logs = getSelfLearningLog({ days: 30 }, rows, now);
    expect(logs.map((l) => l.runDate)).toEqual([
      '2026-10-15',
      '2026-10-12',
      '2026-10-10',
    ]);
  });

  it('status 归一为 applied/held', () => {
    const rows = [{ ...mk('2026-10-15T00:00:00Z'), status: 'held' as const }];
    const logs = getSelfLearningLog({ days: 30 }, rows, now);
    expect(logs[0].status).toBe('held');
  });
});

describe('常量红线', () => {
  it('自学习可控：升/降权阈值与幅度符合要求', () => {
    expect(ADOPTED_HIGH).toBe(0.7);
    expect(ADOPTED_LOW).toBe(0.3);
    expect(MAX_ADJUST_RATIO).toBe(0.2);
    expect(MIN_WEIGHT).toBe(0.1);
    expect(MAX_WEIGHT).toBe(3.0);
  });
});
