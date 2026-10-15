/**
 * 健澜科技 jlmedaios - 权重自进化纯函数单测
 *
 * 覆盖：autoEvolveWeights（升权/降权方向、中间区间不动、无反馈不动、
 *       边界截断 [0.1,2.0]、空数据兜底、不修改入参）、
 *       compareWeights（升降权偏移折算）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  adoptionRateOf,
  autoEvolveWeights,
  compareWeights,
  type WeightMap,
} from '../../src/bff/aggregators/weightEvolutionAggregator';

describe('adoptionRateOf', () => {
  it('采纳率 = 采纳 / (采纳 + 拒绝)', () => {
    expect(adoptionRateOf({ adopted: 8, rejected: 2 })).toBeCloseTo(0.8, 5);
  });

  it('无样本时返回 null（冷启动类型保持不动）', () => {
    expect(adoptionRateOf({ adopted: 0, rejected: 0 })).toBeNull();
  });
});

describe('autoEvolveWeights 调整方向', () => {
  const base: WeightMap = { diagnosis: 1.0, drug: 1.0, pathway: 1.0 };

  it('采纳率 > 0.7 的类型权重 ×1.1（升权）', () => {
    const { newWeights } = autoEvolveWeights(base, {
      diagnosis: { adopted: 9, rejected: 1 }, // 0.9 > 0.7
    });
    expect(newWeights.diagnosis).toBeCloseTo(1.1, 3);
    // drug/pathway 无反馈，保持原权重
    expect(newWeights.drug).toBeCloseTo(1.0, 3);
    expect(newWeights.pathway).toBeCloseTo(1.0, 3);
  });

  it('采纳率 < 0.3 的类型权重 ×0.9（降权）', () => {
    const { newWeights } = autoEvolveWeights(base, {
      pathway: { adopted: 1, rejected: 9 }, // 0.1 < 0.3
    });
    expect(newWeights.pathway).toBeCloseTo(0.9, 3);
  });

  it('采纳率落在 [0.3, 0.7] 区间保持不动', () => {
    const { newWeights } = autoEvolveWeights(base, {
      drug: { adopted: 5, rejected: 5 }, // 0.5
    });
    expect(newWeights.drug).toBeCloseTo(1.0, 3);
  });

  it('不修改入参', () => {
    const snapshot = { ...base };
    autoEvolveWeights(base, { diagnosis: { adopted: 9, rejected: 1 } });
    expect(base).toEqual(snapshot);
  });
});

describe('autoEvolveWeights 边界截断 [0.1, 2.0]', () => {
  it('高权重升权后超过上界 2.0 时截断到 2.0', () => {
    const { newWeights } = autoEvolveWeights(
      { heavy: 2.0 },
      { heavy: { adopted: 9, rejected: 1 } }, // ×1.1 = 2.2 → 截断 2.0
    );
    expect(newWeights.heavy).toBe(2.0);
  });

  it('低权重降权后低于下界 0.1 时截断到 0.1', () => {
    const { newWeights } = autoEvolveWeights(
      { light: 0.1 },
      { light: { adopted: 1, rejected: 9 } }, // ×0.9 = 0.09 → 截断 0.1
    );
    expect(newWeights.light).toBe(0.1);
  });
});

describe('autoEvolveWeights 空数据兜底', () => {
  it('空权重分布返回空对象、零偏移', () => {
    const result = autoEvolveWeights({}, { diagnosis: { adopted: 9, rejected: 1 } });
    expect(result.newWeights).toEqual({});
    expect(result.log.acceptedDelta).toBe(0);
    expect(result.log.rejectedDelta).toBe(0);
  });

  it('空反馈统计时权重全部保持不动、零偏移', () => {
    const { newWeights, log } = autoEvolveWeights(
      { diagnosis: 1.2, drug: 0.8 },
      {},
    );
    expect(newWeights.diagnosis).toBeCloseTo(1.2, 3);
    expect(newWeights.drug).toBeCloseTo(0.8, 3);
    expect(log.acceptedDelta).toBe(0);
    expect(log.rejectedDelta).toBe(0);
    expect(log.feedbackWindowDays).toBe(7);
  });
});

describe('compareWeights', () => {
  it('升权偏移计入 acceptedDelta，降权偏移计入 rejectedDelta', () => {
    const d = compareWeights({ a: 1.0, b: 1.0, c: 1.0 }, { a: 1.1, b: 0.9, c: 1.0 });
    expect(d.acceptedDelta).toBeCloseTo(0.1, 4);
    expect(d.rejectedDelta).toBeCloseTo(0.1, 4);
  });

  it('无变化时两个偏移均为 0', () => {
    expect(compareWeights({ a: 1 }, { a: 1 })).toEqual({ acceptedDelta: 0, rejectedDelta: 0 });
  });
});
