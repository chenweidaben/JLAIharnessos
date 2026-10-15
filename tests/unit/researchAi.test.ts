/**
 * 健澜科技 jlmedaios - 【集团与科研】医学科研智能化纯函数单测（M156-C）
 *
 * 覆盖：
 *  - 病例智能检索：疾病/性别/年龄/时间/治疗/预后/检验指标 多条件 AND；
 *  - 描述性统计：均值/中位数/样本标准差（n-1）手算锚点；
 *  - Welch t 检验：t 分布双侧 p 锚点（df=10, |t|=2.2281 → p≈0.05）；
 *  - 卡方检验：2×2 列联表 χ²=3.9216 → df=1 → p∈(0.04,0.05)；
 *  - Kaplan-Meier：S(t) 连乘与 Greenwood SE、中位生存期；
 *  - 报告生成：结构完整性。
 *
 * 仅测纯函数，不触碰 IO / 时钟。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  SAMPLE_CASE_POOL,
  autoStatisticalAnalysis,
  descriptive,
  generateResearchReport,
  incompleteBeta,
  kaplanMeier,
  smartCaseSearch,
  upperGamma,
  welchTTest,
  chiSquareTest,
} from '../../src/bff/aggregators/researchAiAggregator';

describe('smartCaseSearch 病例智能检索', () => {
  it('疾病关键词命中肺腺癌全部 8 例', () => {
    const r = smartCaseSearch({ disease: '肺腺癌' }, SAMPLE_CASE_POOL);
    expect(r).toHaveLength(8);
  });

  it('疾病+性别组合 AND：肺腺癌且女性 = 4 例', () => {
    const r = smartCaseSearch({ disease: '肺腺癌', gender: 'F' }, SAMPLE_CASE_POOL);
    expect(r.every((c) => c.gender === 'F' && c.diagnoses.some((d) => d.includes('肺腺癌')))).toBe(true);
    expect(r).toHaveLength(4);
  });

  it('年龄区间过滤：60 岁以上肺腺癌患者', () => {
    const r = smartCaseSearch({ disease: '肺腺癌', ageRange: { min: 60 } }, SAMPLE_CASE_POOL);
    // 60+: C002(62), C003(71), C007(63), C008(59 no), C012(60)
    expect(r).toHaveLength(4);
    expect(r.every((c) => c.age >= 60)).toBe(true);
  });

  it('入院时间范围过滤', () => {
    const r = smartCaseSearch(
      { dateRange: { start: '2025-03-01', end: '2025-05-01' } },
      SAMPLE_CASE_POOL,
    );
    expect(r).toHaveLength(4);
  });

  it('治疗方案+预后组合：靶向治疗且好转 = 4 例', () => {
    const r = smartCaseSearch(
      { disease: '肺腺癌', treatment: '靶向', prognosis: '好转' },
      SAMPLE_CASE_POOL,
    );
    expect(r).toHaveLength(4);
  });

  it('检验指标阈值过滤：CEA >= 25 ng/ml = 5 例', () => {
    const r = smartCaseSearch(
      { labFilters: [{ name: 'CEA', op: '>=', value: 25 }] },
      SAMPLE_CASE_POOL,
    );
    expect(r).toHaveLength(5);
  });

  it('空条件返回全池', () => {
    expect(smartCaseSearch({}, SAMPLE_CASE_POOL)).toHaveLength(SAMPLE_CASE_POOL.length);
  });
});

describe('descriptive 描述性统计（手算锚点）', () => {
  it('[2,4,4,4,5,5,7,9]：均值=5 中位数=4.5 样本标准差≈2.138', () => {
    const s = descriptive([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.n).toBe(8);
    expect(s.mean).toBe(5);
    expect(s.median).toBe(4.5);
    // Σ(x-5)² = 9+1+1+1+0+0+4+16 = 32；样本方差 = 32/7 ≈ 4.5714；sd ≈ 2.1381
    expect(s.sd).toBeCloseTo(2.1381, 3);
  });

  it('空数组安全返回空统计', () => {
    expect(descriptive([]).n).toBe(0);
  });
});

describe('Welch t 检验（分布函数锚点）', () => {
  it('df=10, |t|=2.2281 时双侧 p≈0.05（t 分位数锚点）', () => {
    // p = I_{df/(df+t²)}(df/2, 1/2)，签名顺序为 (x, a, b)
    const t = 2.2281;
    const p = incompleteBeta(10 / (10 + t * t), 10 / 2, 1 / 2);
    expect(p).toBeCloseTo(0.05, 2);
  });

  it('两组完全相同 → p≈1', () => {
    const r = welchTTest('A', [1, 2, 3, 4, 5], 'B', [1, 2, 3, 4, 5]);
    expect(r).not.toBeNull();
    expect(r!.t).toBe(0);
    expect(r!.p).toBeCloseTo(1, 6);
  });

  it('A 组均值显著高于 B 组 → p<0.05', () => {
    const r = welchTTest('A', [10, 11, 12, 11, 13], 'B', [5, 6, 4, 5, 5]);
    expect(r).not.toBeNull();
    expect(r!.p).toBeLessThan(0.05);
    expect(r!.significant).toBe(true);
  });

  it('样本量不足时返回 null', () => {
    expect(welchTTest('A', [1], 'B', [2, 3, 4])).toBeNull();
  });
});

describe('卡方检验', () => {
  it('2×2 [[10,90],[20,80]]：χ²≈3.9216，df=1，p∈(0.04,0.05)', () => {
    const r = chiSquareTest([[10, 90], [20, 80]], '组间');
    expect(r).not.toBeNull();
    expect(r!.chi2).toBeCloseTo(3.9216, 3);
    expect(r!.df).toBe(1);
    expect(r!.p).toBeGreaterThan(0.04);
    expect(r!.p).toBeLessThan(0.05);
  });

  it('上侧不完全伽马锚点：χ²=3.841, df=1 → p≈0.05', () => {
    const p = upperGamma(1 / 2, 3.841 / 2);
    expect(p).toBeCloseTo(0.05, 2);
  });
});

describe('Kaplan-Meier 生存分析', () => {
  it('连乘公式：S(10)=0.9，S(20)=0.7875', () => {
    // t=10：风险数 n=10、事件 d=1 → S=0.9
    // t=20：风险数 n=8、事件 d=1 → S=0.9×7/8=0.7875
    const km = kaplanMeier([
      { time: 10, event: 1 },
      { time: 10, event: 0 },
      { time: 20, event: 1 },
      { time: 20, event: 0 },
      { time: 25, event: 0 },
      { time: 25, event: 0 },
      { time: 30, event: 0 },
      { time: 30, event: 0 },
      { time: 35, event: 0 },
      { time: 40, event: 0 },
    ]);
    expect(km.points[0]!.survival).toBe(0.9);
    expect(km.points[1]!.survival).toBe(0.7875);
  });

  it('中位生存期：S(t) 首次 ≤0.5 的时间点', () => {
    const km = kaplanMeier([
      { time: 5, event: 1 },
      { time: 5, event: 1 },
      { time: 10, event: 1 },
      { time: 10, event: 0 },
      { time: 15, event: 1 },
      { time: 15, event: 0 },
    ]);
    // n=6: t=5 S=4/6=0.6667; t=10 S=0.6667*3/4=0.5; t=15 S=0.5*1/3≈0.1667
    expect(km.medianSurvival).toBe(10);
  });
});

describe('autoStatisticalAnalysis 自动统计编排', () => {
  it('两组连续变量+二分类结局：同时产出 t 检验与卡方表格', () => {
    const r = autoStatisticalAnalysis({
      groups: [
        { name: '治疗组', values: [10, 11, 12, 11, 13], events: 3, nonEvents: 7 },
        { name: '对照组', values: [5, 6, 4, 5, 5], events: 6, nonEvents: 4 },
      ],
    });
    expect(r.tTest).not.toBeNull();
    expect(r.tTest!.significant).toBe(true);
    expect(r.chiSquare).not.toBeNull();
    expect(r.tables.length).toBeGreaterThanOrEqual(3);
    expect(r.summary.length).toBeGreaterThan(0);
  });

  it('带生存数据组产出 KM 节点', () => {
    const r = autoStatisticalAnalysis({
      groups: [
        { name: 'A组', survival: [{ time: 5, event: 1 }, { time: 10, event: 0 }] },
        { name: 'B组', survival: [{ time: 8, event: 1 }, { time: 12, event: 1 }] },
      ],
    });
    expect(r.survival).toHaveLength(2);
    expect(r.survival[0]!.km.points.length).toBe(2);
  });
});

describe('generateResearchReport 报告生成', () => {
  it('标题含项目ID，章节完整，结论非空', () => {
    const stats = autoStatisticalAnalysis({
      groups: [
        { name: 'A组', values: [10, 11, 12, 11, 13], events: 3, nonEvents: 7 },
        { name: 'B组', values: [5, 6, 4, 5, 5], events: 6, nonEvents: 4 },
      ],
    });
    const rep = generateResearchReport('PRJ-M156', {
      generatedAt: '2026-10-16T00:00:00Z',
      projectName: '肺腺癌队列',
      disease: '肺腺癌',
      criteria: { disease: '肺腺癌', gender: 'F' },
      matchedCount: 4,
      stats,
    });
    expect(rep.projectId).toBe('PRJ-M156');
    expect(rep.title).toContain('肺腺癌');
    expect(rep.sections.length).toBe(4);
    expect(rep.conclusion.length).toBeGreaterThan(0);
    expect(rep.generatedAt).toBe('2026-10-16T00:00:00Z');
  });
});
