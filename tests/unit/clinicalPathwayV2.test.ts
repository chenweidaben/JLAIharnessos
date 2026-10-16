/**
 * 健澜科技 jlmedaios - 临床路径 V2 纯函数单测（M188-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildClinicalPathway,
  scorePathwayCompliance,
  type PathwayDataV2,
} from '../../src/bff/aggregators/clinicalPathwayV2Aggregator';

describe('scorePathwayCompliance', () => {
  it('完整路径得分高', () => {
    const data: PathwayDataV2 = {
      totalCases: 100,
      enrolledCases: 90,
      completedCases: 85,
      variationCases: 5,
      pathwayLOS: 7,
      nonPathwayLOS: 9,
      pathwayCost: 18000,
      nonPathwayCost: 23000,
    };
    const score = scorePathwayCompliance(data);
    expect(score).toBeGreaterThan(80);
  });

  it('空数据返回 0', () => {
    expect(scorePathwayCompliance({ totalCases: 0, enrolledCases: 0, completedCases: 0, variationCases: 0, pathwayLOS: 0, nonPathwayLOS: 0, pathwayCost: 0, nonPathwayCost: 0 })).toBe(0);
  });
});

describe('buildClinicalPathway', () => {
  it('入组率 = 入组/总数', () => {
    const r = buildClinicalPathway('心内科', '冠心病', '30d');
    expect(r.enrollmentRate).toBeCloseTo(76.0, 0);
  });

  it('路径组住院日短于非路径组', () => {
    const r = buildClinicalPathway('心内科', '冠心病', '30d');
    expect(r.losComparison.pathway).toBeLessThan(r.losComparison.nonPathway);
  });

  it('路径组费用低于非路径组', () => {
    const r = buildClinicalPathway('心内科', '冠心病', '30d');
    expect(r.costComparison.pathway).toBeLessThan(r.costComparison.nonPathway);
  });

  it('包含变异原因分析', () => {
    const r = buildClinicalPathway('心内科', '冠心病', '30d');
    expect(r.variationReasons.length).toBeGreaterThan(0);
  });

  it('入组率低于80%生成建议', () => {
    const r = buildClinicalPathway('心内科', '冠心病', '30d');
    expect(r.suggestions.some((s) => s.includes('入组率'))).toBe(true);
  });
});
