/**
 * 健澜科技 jlmedaios - Doctor MUSE 推荐效果追踪纯函数单测
 *
 * 覆盖：computeAdoptionRate（采纳率/修改率/拒绝率计算、pending 不计分母、
 *       空样本返回 null、按医生过滤、按时间窗口过滤、按类型分组排序）、
 *       identifyLowAdoptionRecommendations（阈值过滤、最小样本数、按率升序）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  computeAdoptionRate,
  identifyLowAdoptionRecommendations,
  type RecommendationRow,
} from '../../src/bff/aggregators/personalAgentAdoptionAggregator';

/** 构造一条推荐记录 */
function makeRow(
  doctorId: string,
  suggestionType: string,
  outcome: RecommendationRow['outcome'],
  daysAgo: number,
  id: string,
): RecommendationRow {
  return {
    id,
    doctorId,
    suggestionType,
    suggestionTitle: `${suggestionType} #${id}`,
    outcome,
    recommendedAt: new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString(),
  };
}

describe('computeAdoptionRate', () => {
  const doctorA = 'doctor-a';
  const doctorB = 'doctor-b';
  const rows: RecommendationRow[] = [
    makeRow(doctorA, 'diagnosis', 'adopted', 1, '1'),
    makeRow(doctorA, 'diagnosis', 'adopted', 2, '2'),
    makeRow(doctorA, 'diagnosis', 'modified', 3, '3'),
    makeRow(doctorA, 'drug', 'rejected', 4, '4'),
    makeRow(doctorA, 'drug', 'rejected', 5, '5'),
    makeRow(doctorA, 'pathway', 'pending', 6, '6'),
    // 其他医生的数据不应被统计
    makeRow(doctorB, 'diagnosis', 'adopted', 1, '7'),
  ];

  it('正确计算采纳率：adopted + modified 计入采纳侧', () => {
    const result = computeAdoptionRate(rows, doctorA, {
      from: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    });
    // resolved = 5（2 adopted + 1 modified + 2 rejected），pending 不计
    expect(result.totalResolved).toBe(5);
    expect(result.adoptedCount).toBe(2);
    expect(result.modifiedCount).toBe(1);
    expect(result.rejectedCount).toBe(2);
    expect(result.pendingCount).toBe(1);
    // adoptionRate = (2 + 1) / 5 = 0.6
    expect(result.adoptionRate).toBeCloseTo(0.6, 5);
    expect(result.modificationRate).toBeCloseTo(0.2, 5);
    expect(result.rejectionRate).toBeCloseTo(0.4, 5);
  });

  it('只统计指定医生的数据', () => {
    const result = computeAdoptionRate(rows, doctorB, {
      from: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    });
    expect(result.totalResolved).toBe(1);
    expect(result.adoptedCount).toBe(1);
  });

  it('按类型分组并按采纳率升序排列', () => {
    const result = computeAdoptionRate(rows, doctorA, {
      from: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    });
    expect(result.byType.length).toBe(3);
    // drug: 0% 采纳（2 rejected）→ 排最前
    expect(result.byType[0].suggestionType).toBe('drug');
    expect(result.byType[0].rate).toBeCloseTo(0, 5);
    // diagnosis: 100% 采纳（2 adopted + 1 modified）→ 排第二
    expect(result.byType[1].suggestionType).toBe('diagnosis');
    expect(result.byType[1].rate).toBeCloseTo(1, 5);
    // pathway: 只有 pending 无已处置样本 → rate 为 null，排最后
    expect(result.byType[2].suggestionType).toBe('pathway');
    expect(result.byType[2].rate).toBeNull();
  });

  it('时间窗口外的数据被过滤', () => {
    const result = computeAdoptionRate(rows, doctorA, {
      from: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    });
    // 只有 1 天前的 adopted 一条
    expect(result.totalResolved).toBe(1);
    expect(result.adoptionRate).toBeCloseTo(1, 5);
  });

  it('空样本时采纳率为 null，不除零', () => {
    const result = computeAdoptionRate([], doctorA, {
      from: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    });
    expect(result.totalResolved).toBe(0);
    expect(result.adoptionRate).toBeNull();
    expect(result.modificationRate).toBeNull();
    expect(result.rejectionRate).toBeNull();
  });
});

describe('identifyLowAdoptionRecommendations', () => {
  it('识别采纳率低于阈值的类型', () => {
    const rows: RecommendationRow[] = [
      // diagnosis: 9/10 = 0.9 → 不低
      ...Array.from({ length: 9 }, (_, i) => makeRow('doc', 'diagnosis', 'adopted', i, `d${i}`)),
      makeRow('doc', 'diagnosis', 'rejected', 0, 'd9'),
      // drug: 2/10 = 0.2 → 低
      ...Array.from({ length: 2 }, (_, i) => makeRow('doc', 'drug', 'adopted', i, `g${i}`)),
      ...Array.from({ length: 8 }, (_, i) => makeRow('doc', 'drug', 'rejected', i, `r${i}`)),
      // pathway: 3/5 = 0.6 → 不低
      ...Array.from({ length: 3 }, (_, i) => makeRow('doc', 'pathway', 'adopted', i, `p${i}`)),
      ...Array.from({ length: 2 }, (_, i) => makeRow('doc', 'pathway', 'rejected', i, `pr${i}`)),
    ];
    const result = identifyLowAdoptionRecommendations(rows, 0.5, 5);
    expect(result.length).toBe(1);
    expect(result[0].suggestionType).toBe('drug');
    expect(result[0].rate).toBeCloseTo(0.2, 5);
  });

  it('样本数不足 minSamples 时不参与判定', () => {
    const rows: RecommendationRow[] = [
      makeRow('doc', 'rare', 'rejected', 0, '1'),
      makeRow('doc', 'rare', 'rejected', 1, '2'),
      // rare 只有 2 条，低于 minSamples=5
    ];
    const result = identifyLowAdoptionRecommendations(rows, 0.5, 5);
    expect(result.length).toBe(0);
  });

  it('空列表返回空数组', () => {
    expect(identifyLowAdoptionRecommendations([])).toEqual([]);
  });
});
