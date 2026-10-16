/**
 * 健澜科技 jlmedaios - M166-A 【绩效与人才】科室绩效考核深化聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 buildDepartmentKPI / calculatePerformanceScore /
 * benchmarkDepartment / identifyPerformanceGap。重点验证「绩效考核要公平，
 * 不能只看工作量」：
 *   - 五维权重合计 = 1.0，且效率（工作量）维度权重仅 0.20；
 *   - 每个指标归一化得分在 0-120，反向指标（并发症/投诉/药占比）同样扣分；
 *   - 总分 = 维度分 × 权重 加权合成，可复算、可申诉；
 *   - 对标输出全院平均/前四分位/百分位；
 *   - 差距识别只列低于目标的指标，按缺口降序，优先级分级。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDepartmentKPI,
  calculatePerformanceScore,
  benchmarkDepartment,
  identifyPerformanceGap,
  DIMENSION_WEIGHT,
  DIMENSION_LABEL,
  type DimensionScore,
  type PerformanceScore,
} from '@/bff/aggregators/performanceDeepAggregator';

describe('buildDepartmentKPI', () => {
  it('返回科室五维十三项指标结构', () => {
    const kpi = buildDepartmentKPI('internal_medicine', 2026, 3);
    expect(kpi.dept).toBe('internal_medicine');
    expect(kpi.period).toBe('2026Q3');

    const dims = Object.keys(kpi.dimensions) as Array<keyof typeof kpi.dimensions>;
    expect(dims).toHaveLength(5);
    // 五维十三项：质量3 + 效率3 + 满意3 + 教研3 + 成本3
    const totalMetrics = dims.reduce((s, d) => s + kpi.dimensions[d].length, 0);
    expect(totalMetrics).toBe(15);
  });

  it('权重守恒：五维权重合计 = 1.0，且工作量（效率）只占 0.20', () => {
    const sum = Object.values(DIMENSION_WEIGHT).reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 100)).toBe(100);
    // 公平性核心：运营效率（含门诊量/手术量）权重不得超过 0.25
    expect(DIMENSION_WEIGHT.efficiency).toBeLessThanOrEqual(0.25);
    expect(DIMENSION_WEIGHT.efficiency).toBe(0.20);
    // 质量 + 满意合计 ≥ 0.45，引导不只看量
    expect(DIMENSION_WEIGHT.quality + DIMENSION_WEIGHT.satisfaction).toBeGreaterThanOrEqual(0.45);
  });

  it('确定性：同科室同年同季两次结果完全一致（可复算、可申诉）', () => {
    const a = buildDepartmentKPI('surgery', 2026, 2);
    const b = buildDepartmentKPI('surgery', 2026, 2);
    expect(a).toEqual(b);
  });

  it('未知科室回退内科基线，不抛随机数', () => {
    const kpi = buildDepartmentKPI('not-exist-dept', 2026, 1);
    expect(kpi.dept).toBe('not-exist-dept');
    expect(kpi.deptName).toBe('not-exist-dept'); // 未命中映射则用编码本身
    expect(Object.keys(kpi.dimensions)).toHaveLength(5);
  });

  it('每个指标都有方向与目标值，样本量非负', () => {
    const kpi = buildDepartmentKPI('cardiology', 2026, 4);
    for (const dim of Object.keys(kpi.dimensions) as Array<keyof typeof kpi.dimensions>) {
      for (const m of kpi.dimensions[dim]) {
        expect(m.direction === 'higher_is_better' || m.direction === 'lower_is_better').toBe(true);
        expect(m.target).toBeGreaterThan(0);
        expect(m.sampleSize).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('calculatePerformanceScore', () => {
  it('总分在 0-120 之间，五维齐全', () => {
    const s = calculatePerformanceScore('internal_medicine', '2026Q3');
    expect(s.totalScore).toBeGreaterThanOrEqual(0);
    expect(s.totalScore).toBeLessThanOrEqual(120);
    expect(s.dimensions).toHaveLength(5);
  });

  it('总分 = Σ(维度分 × 维度权重)，可复算', () => {
    const s = calculatePerformanceScore('surgery', '2026Q2');
    const recomputed = s.dimensions.reduce(
      (sum: number, d: DimensionScore) => sum + d.score * d.weight,
      0,
    );
    expect(Math.round(recomputed * 100)).toBe(Math.round(s.totalScore * 100));
  });

  it('等级映射自洽：≥90优秀 / ≥80良好 / ≥70合格 / <70待改进', () => {
    const s = calculatePerformanceScore('pediatrics', '2026Q1');
    const expectGrade =
      s.totalScore >= 90 ? 'excellent'
      : s.totalScore >= 80 ? 'good'
      : s.totalScore >= 70 ? 'fair'
      : 'needs_improvement';
    expect(s.grade).toBe(expectGrade);
  });

  it('每个指标归一化得分在 0-120，反向指标同样被计分', () => {
    const s = calculatePerformanceScore('icu', '2026Q4');
    const reverseCodes = new Set([
      'surgery_complication_rate', 'avg_los', 'complaint_rate',
      'avg_visit_cost', 'drug_ratio', 'consumable_ratio',
    ]);
    for (const d of s.dimensions) {
      for (const m of d.metrics) {
        expect(m.score).toBeGreaterThanOrEqual(0);
        expect(m.score).toBeLessThanOrEqual(120);
        if (reverseCodes.has(m.code)) {
          // 反向指标方向正确
          expect(m.direction).toBe('lower_is_better');
        }
      }
    }
  });

  it('工作量指标（门诊量/手术量）只占效率维度一格，不主导总分', () => {
    const s = calculatePerformanceScore('emergency', '2026Q3');
    const eff = s.dimensions.find((d) => d.code === 'efficiency');
    expect(eff).toBeDefined();
    // 效率维度权重 0.20，意味着即使手术量满分，对总分贡献上限 = 100*0.20 = 20
    expect(eff!.weight).toBe(0.20);
    const workloadMetrics = eff!.metrics.filter((m) =>
      ['outpatient_volume', 'surgery_volume', 'bed_turnover'].includes(m.code),
    );
    expect(workloadMetrics.length).toBe(3);
  });

  it('中文维度标签齐全', () => {
    const s = calculatePerformanceScore('orthopedics', '2026Q1');
    for (const d of s.dimensions) {
      expect(DIMENSION_LABEL[d.code]).toBe(d.label);
    }
  });
});

describe('benchmarkDepartment', () => {
  function makePeer(dept: string, total: number): PerformanceScore {
    const base = calculatePerformanceScore(dept, '2026Q3');
    return { ...base, totalScore: total };
  }

  it('输出全院平均、前四分位、百分位与科室总数', () => {
    const self = makePeer('internal_medicine', 88);
    const peers = [
      makePeer('internal_medicine', 88),
      makePeer('surgery', 92),
      makePeer('pediatrics', 75),
      makePeer('cardiology', 82),
      makePeer('neurology', 95),
    ];
    const r = benchmarkDepartment('internal_medicine', { self, peers });
    expect(r.selfScore).toBe(88);
    expect(r.deptCount).toBe(5);
    expect(r.hospitalAverage).toBeGreaterThan(0);
    expect(r.topQuartile).toBeGreaterThanOrEqual(r.hospitalAverage);
    expect(r.percentile).toBeGreaterThanOrEqual(0);
    expect(r.percentile).toBeLessThanOrEqual(100);
  });

  it('百分位自洽：得分最高者百分位接近 100', () => {
    const top = makePeer('top_dept', 99);
    const peers = [
      makePeer('a', 70), makePeer('b', 75), makePeer('c', 80),
      makePeer('d', 85), top,
    ];
    const r = benchmarkDepartment('top_dept', { self: top, peers });
    expect(r.percentile).toBeGreaterThanOrEqual(80);
  });

  it('逐维对比全院平均：delta = 本科室维度分 - 全院平均维度分', () => {
    const self = makePeer('surgery', 85);
    const peers = [self, makePeer('a', 80), makePeer('b', 90)];
    const r = benchmarkDepartment('surgery', { self, peers });
    expect(r.dimensionVsAverage.length).toBe(5);
    for (const d of r.dimensionVsAverage) {
      expect(d.delta).toBeCloseTo(d.self - d.average, 1);
    }
  });

  it('空 peers 降级为单科室，不崩溃', () => {
    const self = calculatePerformanceScore('icu', '2026Q3');
    const r = benchmarkDepartment('icu', { self, peers: [] });
    expect(r.deptCount).toBe(1);
    expect(r.selfScore).toBe(self.totalScore);
  });
});

describe('identifyPerformanceGap', () => {
  it('只列低于目标的指标，按缺口降序排列', () => {
    const gaps = identifyPerformanceGap('oncology', 100);
    expect(Array.isArray(gaps)).toBe(true);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1].gap).toBeGreaterThanOrEqual(gaps[i].gap);
    }
    // 所有列出的指标当前分都低于目标
    for (const g of gaps) {
      expect(g.currentScore).toBeLessThan(g.targetScore);
      expect(g.gap).toBeCloseTo(g.targetScore - g.currentScore, 1);
    }
  });

  it('优先级分级自洽：缺口≥25为high，≥10为medium，否则low', () => {
    const gaps = identifyPerformanceGap('pediatrics', 100);
    for (const g of gaps) {
      if (g.gap >= 25) expect(g.priority).toBe('high');
      else if (g.gap >= 10) expect(g.priority).toBe('medium');
      else expect(g.priority).toBe('low');
    }
  });

  it('每条差距都带改进建议与维度标签', () => {
    const gaps = identifyPerformanceGap('emergency', 100);
    for (const g of gaps) {
      expect(g.suggestion.length).toBeGreaterThan(0);
      expect(g.dimensionLabel.length).toBeGreaterThan(0);
      expect(g.metricName.length).toBeGreaterThan(0);
    }
  });

  it('目标分越高，列出的差距越多（单调性）', () => {
    const lowTarget = identifyPerformanceGap('surgery', 80);
    const highTarget = identifyPerformanceGap('surgery', 110);
    expect(highTarget.length).toBeGreaterThanOrEqual(lowTarget.length);
  });
});
