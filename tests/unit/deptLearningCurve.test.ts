/**
 * 健澜科技 jlmedaios - 科室学习曲线聚合器单测（M119-B）
 *
 * 覆盖：
 *  - 学习曲线计算：monthlyGrowth 逐月条数与环比 / successTrend 逐月成功率 /
 *    lessonReduction 逐月教训与前后半降幅 / bestPracticeCount 阈值口径；
 *  - 趋势对比：compareDeptCurves 与入参顺序严格对齐、多科室形状可辨；
 *  - 空科室兜底：空数组 / null / 不存在的科室 / 非法时间一律零值结果，
 *    绝不抛异常（依据宪法第七章 7.7「不评判对错，只记录事实」）。
 *
 * 注意：纯函数测试，不连接 PostgreSQL。锚定 now 保证月份轴确定。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeptLearningCurve,
  compareDeptCurves,
  type LearningCurveDecision,
} from '../../src/bff/aggregators/deptLearningCurveAggregator.js';

/** 锚定时间：2026-10-15 UTC；months=3 时月份轴为 2026-08 / 09 / 10 */
const NOW = '2026-10-15T00:00:00.000Z';

/** 造一条决策；ym 形如 '2026-08' */
function mk(
  deptCode: string,
  ym: string,
  success: boolean,
  topic = '默认主题',
): LearningCurveDecision {
  return {
    staffId: `${deptCode}-s1`,
    deptCode,
    topic,
    success,
    createdAt: `${ym}-10T09:00:00.000Z`,
  };
}

describe('buildDeptLearningCurve - 学习曲线计算', () => {
  it('monthlyGrowth：逐月条数 + 环比（首月为 null）', () => {
    const rows = [
      mk('DEP-A', '2026-08', true),
      mk('DEP-A', '2026-08', true),
      mk('DEP-A', '2026-09', true),
      mk('DEP-A', '2026-09', true),
      mk('DEP-A', '2026-09', true),
      mk('DEP-A', '2026-09', true),
      mk('DEP-A', '2026-09', true),
      mk('DEP-A', '2026-10', true),
      mk('DEP-A', '2026-10', true),
      mk('DEP-A', '2026-10', true),
    ];
    const curve = buildDeptLearningCurve('DEP-A', { months: 3, now: NOW }, rows);
    expect(curve.window).toEqual({ from: '2026-08', to: '2026-10', months: 3 });
    expect(curve.monthlyGrowth).toEqual([
      { month: '2026-08', count: 2, momGrowthPct: null },
      { month: '2026-09', count: 5, momGrowthPct: 150 }, // (5-2)/2=150%
      { month: '2026-10', count: 3, momGrowthPct: -40 }, // (3-5)/5=-40%
    ]);
  });

  it('successTrend：逐月成功率（成功/总数，4 位小数）', () => {
    const rows = [
      mk('DEP-A', '2026-08', true),
      mk('DEP-A', '2026-08', true),
      mk('DEP-A', '2026-08', true),
      mk('DEP-A', '2026-08', false), // 1 教训
      mk('DEP-A', '2026-09', true),
      mk('DEP-A', '2026-09', true),
      mk('DEP-A', '2026-10', true),
    ];
    const curve = buildDeptLearningCurve('DEP-A', { months: 3, now: NOW }, rows);
    expect(curve.successTrend).toEqual([
      { month: '2026-08', successRate: 0.75, sampleSize: 4 },
      { month: '2026-09', successRate: 1, sampleSize: 2 },
      { month: '2026-10', successRate: 1, sampleSize: 1 },
    ]);
  });

  it('lessonReduction：逐月教训 + 前后半窗口降幅（正数=教训在收敛）', () => {
    const rows = [
      mk('DEP-A', '2026-08', false),
      mk('DEP-A', '2026-08', false),
      mk('DEP-A', '2026-08', true),
      mk('DEP-A', '2026-09', false),
      mk('DEP-A', '2026-10', true),
    ];
    const curve = buildDeptLearningCurve('DEP-A', { months: 3, now: NOW }, rows);
    expect(curve.lessonReduction.monthly).toEqual([
      { month: '2026-08', lessons: 2 },
      { month: '2026-09', lessons: 1 },
      { month: '2026-10', lessons: 0 },
    ]);
    // half=1：前半月均=2，后半月均=(1+0)/2=0.5 → 降幅 (2-0.5)/2=75%
    expect(curve.lessonReduction.reductionPct).toBe(75);
  });

  it('bestPracticeCount：累计≥5 且成功率≥0.8 的主题数', () => {
    const rows = [
      // T1：6 次全成功 → 计入最佳实践
      ...Array.from({ length: 6 }, () => mk('DEP-A', '2026-08', true, 'T1')),
      // T2：仅 4 次 → 次数不足，不计
      ...Array.from({ length: 4 }, () => mk('DEP-A', '2026-09', true, 'T2')),
      // T3：5 次但 2 失败 → 成功率 0.6 < 0.8，不计
      ...Array.from({ length: 3 }, () => mk('DEP-A', '2026-10', true, 'T3')),
      ...Array.from({ length: 2 }, () => mk('DEP-A', '2026-10', false, 'T3')),
    ];
    const curve = buildDeptLearningCurve('DEP-A', { months: 3, now: NOW }, rows);
    expect(curve.bestPracticeCount).toBe(1);
  });

  it('窗口外数据与脏时间静默跳过，不影响窗口内口径', () => {
    const rows = [
      mk('DEP-A', '2026-08', true),
      mk('DEP-A', '2026-03', true), // 窗口外（早于 2026-08）
      { staffId: 'x', deptCode: 'DEP-A', topic: 'T', success: true, createdAt: 'not-a-date' },
      { staffId: 'x', deptCode: 'DEP-B', topic: 'T', success: true, createdAt: '2026-09-10T00:00:00Z' },
    ];
    const curve = buildDeptLearningCurve('DEP-A', { months: 3, now: NOW }, rows);
    expect(curve.monthlyGrowth[0].count).toBe(1);
    expect(curve.monthlyGrowth[1].count).toBe(0);
  });
});

describe('compareDeptCurves - 多科室趋势对比', () => {
  it('与入参顺序严格对齐，空科室输出零值行不打乱顺序', () => {
    const rows = [
      // DEP-B：高基线
      mk('DEP-B', '2026-08', true),
      mk('DEP-B', '2026-09', true),
      mk('DEP-B', '2026-10', true),
      // DEP-A：爬坡
      mk('DEP-A', '2026-08', false),
      mk('DEP-A', '2026-09', true),
      mk('DEP-A', '2026-10', true),
    ];
    const comparison = compareDeptCurves(
      ['DEP-B', 'DEP-A', 'DEP-EMPTY', 'DEP-A'], // 重复自动去重
      rows,
      { timeRange: { months: 3, now: NOW } },
    );
    expect(comparison.map((r) => r.deptCode)).toEqual(['DEP-B', 'DEP-A', 'DEP-EMPTY']);

    const [b, a, empty] = comparison;
    expect(b.totalDecisions).toBe(3);
    expect(b.avgSuccessRate).toBe(1);
    expect(a.totalDecisions).toBe(3);
    expect(a.avgSuccessRate).toBeCloseTo(2 / 3, 4);
    // 空科室兜底：全零
    expect(empty.totalDecisions).toBe(0);
    expect(empty.avgSuccessRate).toBe(0);
    expect(empty.bestPracticeCount).toBe(0);
    expect(empty.curve.monthlyGrowth).toHaveLength(3);
  });

  it('趋势可辨：学习快的科室教训降幅更大', () => {
    const rows = [
      // 快学者：前期 4 教训，后期 0
      ...Array.from({ length: 4 }, () => mk('DEP-FAST', '2026-08', false)),
      ...Array.from({ length: 2 }, () => mk('DEP-FAST', '2026-09', false)),
      ...Array.from({ length: 3 }, () => mk('DEP-FAST', '2026-10', true)),
      // 慢学者：教训维持高位
      ...Array.from({ length: 2 }, () => mk('DEP-SLOW', '2026-08', false)),
      ...Array.from({ length: 2 }, () => mk('DEP-SLOW', '2026-09', false)),
      ...Array.from({ length: 2 }, () => mk('DEP-SLOW', '2026-10', false)),
    ];
    const comparison = compareDeptCurves(['DEP-FAST', 'DEP-SLOW'], rows, {
      timeRange: { months: 3, now: NOW },
    });
    const fast = comparison.find((r) => r.deptCode === 'DEP-FAST')!;
    const slow = comparison.find((r) => r.deptCode === 'DEP-SLOW')!;
    expect(fast.reductionPct).toBeGreaterThan(slow.reductionPct);
    expect(slow.reductionPct).toBeLessThanOrEqual(0); // 教训未收敛 → 非正
  });
});

describe('buildDeptLearningCurve - 空科室兜底', () => {
  it('空数组：结构完整的零值结果，绝不抛错', () => {
    const curve = buildDeptLearningCurve('DEP-NOPE', { months: 6, now: NOW }, []);
    expect(curve.deptCode).toBe('DEP-NOPE');
    expect(curve.window).toEqual({ from: '2026-05', to: '2026-10', months: 6 });
    expect(curve.monthlyGrowth).toHaveLength(6);
    expect(curve.monthlyGrowth.every((p) => p.count === 0)).toBe(true);
    expect(curve.successTrend.every((p) => p.successRate === 0)).toBe(true);
    expect(curve.lessonReduction.reductionPct).toBe(0);
    expect(curve.bestPracticeCount).toBe(0);
  });

  it('null / undefined 入参与空科室编码：同样零值兜底', () => {
    expect(() => buildDeptLearningCurve('', { months: 3, now: NOW }, null as never)).not.toThrow();
    expect(() =>
      buildDeptLearningCurve('DEP-X', undefined, undefined as never),
    ).not.toThrow();
    const curve = buildDeptLearningCurve('DEP-X', { now: NOW }, []);
    expect(curve.window.months).toBe(6); // 默认 6 个月
  });

  it('months 非法输入被收敛到 1~24，不炸', () => {
    const a = buildDeptLearningCurve('DEP-X', { months: 999, now: NOW }, []);
    expect(a.window.months).toBe(24);
    const b = buildDeptLearningCurve('DEP-X', { months: -3, now: NOW }, []);
    expect(b.window.months).toBe(1);
    const c = buildDeptLearningCurve('DEP-X', { months: 'abc' as never, now: NOW }, []);
    expect(c.window.months).toBe(6);
  });
});
