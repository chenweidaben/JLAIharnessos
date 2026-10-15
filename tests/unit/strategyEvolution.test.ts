/**
 * 健澜科技 jlmedaios - 推荐策略进化纯函数单测
 *
 * 覆盖：evolveWeights（采纳率高的类型升权/被拒类型降权/归一化/无反馈不动）、
 *       compareStrategies（A/B 采纳率对比胜负）、版本回滚辅助。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  adoptionRateOf,
  compareStrategies,
  evolveWeights,
  nextVersion,
  pickRollbackVersion,
  type StrategyWeights,
  type StrategyVersionRecord,
} from '../../src/bff/aggregators/strategyEvolutionAggregator';

describe('adoptionRateOf', () => {
  it('采纳率 = (采纳 + 0.5*修改) / 总数', () => {
    expect(adoptionRateOf({ adopted: 80, modified: 12, rejected: 8 })).toBeCloseTo(0.86, 5);
  });

  it('无反馈样本时返回中性基准 0.5', () => {
    expect(adoptionRateOf({ adopted: 0, modified: 0, rejected: 0 })).toBe(0.5);
  });
});

describe('evolveWeights', () => {
  const base: StrategyWeights = { diagnosis: 0.5, drug: 0.3, pathway: 0.2 };

  it('采纳率高的类型权重上升，被反复拒绝的类型权重下降', () => {
    const next = evolveWeights(base, {
      diagnosis: { adopted: 80, modified: 12, rejected: 8 }, // 采纳率 0.86
      drug: { adopted: 45, modified: 10, rejected: 25 },   // 采纳率 0.625
      pathway: { adopted: 5, modified: 2, rejected: 23 },  // 采纳率 0.20
    });
    // 高采纳类型升权、低采纳类型降权
    expect(next.diagnosis).toBeGreaterThan(0.5);
    expect(next.pathway).toBeLessThan(0.2);
    // 归一化后总和为 1
    const sum = Object.values(next).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it('无任何反馈的类型保持原相对比例，不被噪声扰动', () => {
    const next = evolveWeights(base, {
      diagnosis: { adopted: 10, modified: 0, rejected: 0 }, // 仅 diagnosis 有反馈
    });
    // drug:pathway 仍保持 3:2
    expect(next.drug / next.pathway).toBeCloseTo(1.5, 3);
    // diagnosis 被升权后占比上升
    expect(next.diagnosis).toBeGreaterThan(0.5);
  });

  it('空权重分布返回空对象', () => {
    expect(evolveWeights({}, { diagnosis: { adopted: 3, modified: 0, rejected: 1 } })).toEqual({});
  });

  it('不修改入参', () => {
    const snapshot = { ...base };
    evolveWeights(base, { diagnosis: { adopted: 9, modified: 0, rejected: 9 } });
    expect(base).toEqual(snapshot);
  });
});

describe('compareStrategies', () => {
  it('采纳率高的策略胜', () => {
    expect(compareStrategies({ adoptionRate: 0.8 }, { adoptionRate: 0.6 })).toBe('a');
    expect(compareStrategies({ adoptionRate: 0.6 }, { adoptionRate: 0.8 })).toBe('b');
  });

  it('采纳率相等判 tie', () => {
    expect(compareStrategies({ adoptionRate: 0.7 }, { adoptionRate: 0.7 })).toBe('tie');
  });
});

describe('版本回滚', () => {
  const history: StrategyVersionRecord[] = [
    { id: '1', strategyName: 'default-mix', version: 3, active: true },
    { id: '2', strategyName: 'default-mix', version: 2, active: false },
    { id: '3', strategyName: 'default-mix', version: 1, active: false },
  ];

  it('按版本号定位历史回滚目标', () => {
    const target = pickRollbackVersion(history, 1);
    expect(target?.id).toBe('3');
    expect(pickRollbackVersion(history, 99)).toBeNull();
  });

  it('下一版本号 = max(version)+1，空历史从 1 开始', () => {
    expect(nextVersion(history)).toBe(4);
    expect(nextVersion([])).toBe(1);
  });
});
