/**
 * 健澜科技 jlmedaios - M176-A 【临床核心深化】DRG/DIP 付费深度分析纯函数单测。
 *
 * 不依赖数据库：仅测 checkGrouping / calculateDRGProfitLoss /
 *   identifyDRGInlier / buildDeepDRGAnalysis / optimizeDRGPerformance。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepDRGAnalysis,
  calculateDRGProfitLoss,
  checkGrouping,
  identifyDRGInlier,
  optimizeDRGPerformance,
  type DRGCase,
} from '@/bff/aggregators/drgDeepAggregator';

describe('checkGrouping 分组正确性', () => {
  it('内科主诊断（肺炎 J18）无手术、入组 ES29 → correct', () => {
    const r = checkGrouping({
      visitId: 'v1', primaryDx: 'J18.9', hasOrp: false, groupCode: 'ES29', actualCost: 7800, losDays: 8,
    });
    expect(r.correctness).toBe('correct');
    expect(r.expectedGroup).toBe('ES29');
    expect(r.reasons).toHaveLength(0);
  });

  it('外科主诊断（胆囊 K80）却无手术室操作 → wrong（内外组错配）', () => {
    const r = checkGrouping({
      visitId: 'v2', primaryDx: 'K80.2', hasOrp: false, groupCode: 'GB25', actualCost: 14200, losDays: 9,
    });
    expect(r.correctness).toBe('wrong');
    expect(r.expectedGroup).toBe('GB25');
    expect(r.reasons.join()).toContain('无手术室操作');
  });

  it('诊断明确命中规则却落入 UZ00（未入组）→ wrong（应入组未入组）', () => {
    const r = checkGrouping({
      visitId: 'v3', primaryDx: 'J18.9', hasOrp: false, groupCode: 'UZ00', actualCost: 7800, losDays: 8,
    });
    expect(r.correctness).toBe('wrong');
    expect(r.reasons.join()).toContain('UZ00');
  });

  it('主诊断未匹配任何规则 → suspect（待医保办核定）', () => {
    const r = checkGrouping({
      visitId: 'v4', primaryDx: 'E11.9', hasOrp: false, groupCode: 'UZ00', actualCost: 6000, losDays: 6,
    });
    expect(r.correctness).toBe('suspect');
    expect(r.expectedGroup).toBe('UZ00');
  });

  it('内科组却含手术室操作 → suspect（可能应入外科组）', () => {
    const r = checkGrouping({
      visitId: 'v5', primaryDx: 'I50.9', hasOrp: true, groupCode: 'FB29', actualCost: 9000, losDays: 8,
    });
    expect(r.correctness).toBe('suspect');
  });

  it('缺主诊断 → suspect 且不抛错', () => {
    const r = checkGrouping({
      visitId: 'v6', primaryDx: '', hasOrp: false, groupCode: 'UZ00', actualCost: 5000, losDays: 5,
    });
    expect(r.correctness).toBe('suspect');
  });
});

describe('calculateDRGProfitLoss 单病例盈亏', () => {
  it('标准付费 8000、实际 7800 → 结余 +200，verdict=profit', () => {
    const r = calculateDRGProfitLoss('p1', { groupCode: 'ES29', weight: 0.8, rate: 10000, actualCost: 7800 });
    expect(r.standardPayment).toBe(8000);
    expect(r.profitLoss).toBe(200);
    expect(r.verdict).toBe('profit');
    expect(r.deviationRate).toBe(-0.025);
  });

  it('标准付费 12000、实际 14800 → 超支 -2800，verdict=loss', () => {
    const r = calculateDRGProfitLoss('p2', { groupCode: 'FC25', weight: 1.2, rate: 10000, actualCost: 14800 });
    expect(r.standardPayment).toBe(12000);
    expect(r.profitLoss).toBe(-2800);
    expect(r.verdict).toBe('loss');
    expect(r.deviationRate).toBeCloseTo(0.233, 2);
  });

  it('费率缺省回落 DEFAULT_RATE(10000)；实际=标准 → balanced', () => {
    const r = calculateDRGProfitLoss('p3', { groupCode: 'IB29', weight: 1.0, rate: 0, actualCost: 10000 });
    expect(r.standardPayment).toBe(10000);
    expect(r.profitLoss).toBe(0);
    expect(r.verdict).toBe('balanced');
  });
});

describe('identifyDRGInlier 离群病例识别', () => {
  it('费用 > 胆囊组均(15000) 2 倍 → high_cost_outlier，建议特例单议', () => {
    const r = identifyDRGInlier('GB25', 33000, 11);
    expect(r.status).toBe('high_cost_outlier');
    expect(r.action).toContain('特例单议');
  });

  it('心衰组住院 17 天 > 组均(8天) 2 倍 → long_los_outlier', () => {
    const r = identifyDRGInlier('FB29', 9000, 17);
    expect(r.status).toBe('long_los_outlier');
  });

  it('费用 < 阑尾组均(10000) 0.4 倍且住院日偏短 → low_cost_outlier（低标入院嫌疑）', () => {
    const r = identifyDRGInlier('IB29', 3200, 3);
    expect(r.status).toBe('low_cost_outlier');
    expect(r.action).toContain('病案');
  });

  it('费用与住院日均在正常带内 → inlier', () => {
    const r = identifyDRGInlier('GB25', 14600, 9);
    expect(r.status).toBe('inlier');
    expect(r.action).toBe('');
  });
});

const SAMPLE: DRGCase[] = [
  { visitId: 'v1', primaryDx: 'J18.9', hasOrp: false, groupCode: 'ES29', actualCost: 7800, losDays: 8 },
  { visitId: 'v2', primaryDx: 'I50.9', hasOrp: false, groupCode: 'FB29', actualCost: 8600, losDays: 7 },
  { visitId: 'v3', primaryDx: 'I21.0', hasOrp: false, groupCode: 'FC25', actualCost: 14800, losDays: 9 },
  { visitId: 'v4', primaryDx: 'K80.2', hasOrp: false, groupCode: 'GB25', actualCost: 14200, losDays: 9 },
  { visitId: 'v5', primaryDx: 'K80.3', hasOrp: true, groupCode: 'GB25', actualCost: 14600, losDays: 9 },
  { visitId: 'v6', primaryDx: 'K80.3', hasOrp: true, groupCode: 'GB25', actualCost: 33000, losDays: 11 },
  { visitId: 'v7', primaryDx: 'K35.9', hasOrp: true, groupCode: 'IB29', actualCost: 3200, losDays: 3 },
];

describe('buildDeepDRGAnalysis 深度分析总装', () => {
  it('CMI = Σ权重/病例数 = 8.4/7 = 1.2', () => {
    const r = buildDeepDRGAnalysis({ dept: '测试科', period: '2026-09', cases: SAMPLE });
    expect(r.diseaseStructure.caseCount).toBe(7);
    expect(r.diseaseStructure.cmi).toBe(1.2);
  });

  it('病种结构：时间消耗指数<1、费用消耗指数≈1.145', () => {
    const r = buildDeepDRGAnalysis({ dept: '测试科', period: '2026-09', cases: SAMPLE });
    expect(r.diseaseStructure.timeEfficiencyIndex).toBeCloseTo(0.933, 1);
    expect(r.diseaseStructure.costEfficiencyIndex).toBeCloseTo(1.145, 1);
  });

  it('分组汇总：6 正确 / 1 错误（K80 无手术），错误率≈14.3%', () => {
    const r = buildDeepDRGAnalysis({ dept: '测试科', period: '2026-09', cases: SAMPLE });
    expect(r.groupingSummary.correct).toBe(6);
    expect(r.groupingSummary.wrong).toBe(1);
    expect(r.groupingSummary.wrongRate).toBeCloseTo(0.143, 2);
  });

  it('科室净盈亏 = 200+400-2800+800+400-18000+6800 = -12200', () => {
    const r = buildDeepDRGAnalysis({ dept: '测试科', period: '2026-09', cases: SAMPLE });
    expect(r.deptProfitLoss).toBe(-12200);
    expect(r.lossCaseCount).toBe(2);
    expect(r.profitCaseCount).toBe(5);
  });

  it('离群病例仅输出非 inlier：高费用 1 例 + 低费用短住院 1 例', () => {
    const r = buildDeepDRGAnalysis({ dept: '测试科', period: '2026-09', cases: SAMPLE });
    expect(r.outliers).toHaveLength(2);
    expect(r.outliers.map((o) => o.status).sort()).toEqual(['high_cost_outlier', 'low_cost_outlier']);
  });

  it('空病例列表安全降级为零报告，不抛错', () => {
    const r = buildDeepDRGAnalysis({ dept: '空科', period: '2026-09', cases: [] });
    expect(r.diseaseStructure.caseCount).toBe(0);
    expect(r.groupingSummary.total).toBe(0);
    expect(r.outliers).toHaveLength(0);
  });
});

describe('optimizeDRGPerformance 绩效优化建议', () => {
  it('错误率>5% 且存在离群 → 给出分组质控 + 离群两类建议', () => {
    const r = optimizeDRGPerformance('普外科', '2026-09', SAMPLE);
    const dims = r.recommendations.map((x) => x.dimension);
    expect(dims).toContain('grouping');
    expect(dims).toContain('outlier');
    for (const rec of r.recommendations) {
      expect(rec.action.length).toBeGreaterThan(0);
      expect(rec.expectedEffect.length).toBeGreaterThan(0);
    }
  });

  it('无病例数据 → 返回 info 级落库提示建议', () => {
    const r = optimizeDRGPerformance('空科', '2026-09', []);
    expect(r.recommendations).toHaveLength(1);
    expect(r.recommendations[0].severity).toBe('info');
  });
});
