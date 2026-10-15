/**
 * 健澜科技 jlmedaios - 满意度纯函数测试（M63-A + M141-B）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  departmentRanking, dimensionAverage, lowDimension, type SurveyRow,
} from '../../src/medical-tools/nursing/satisfaction.js';
// M141-B 匿名患者满意度调查（患者敢说真话）
import {
  SATISFACTION_DIMENSIONS,
  analyzeSatisfaction,
  createSurvey,
  generateImprovementSuggestions,
  submitAnonymousSurvey,
  type SatisfactionDimensionKey,
} from '../../src/bff/aggregators/satisfactionAggregator';

describe('dimensionAverage', () => {
  it('四维度均分', () => {
    expect(dimensionAverage({ medical: 5, nursing: 4, logistics: 3, environment: 4 })).toBe(4);
  });
});

describe('departmentRanking', () => {
  it('按科室均分降序', () => {
    const rows: SurveyRow[] = [
      { department: 'A', medical: 5, nursing: 5, logistics: 5, environment: 5 },
      { department: 'B', medical: 1, nursing: 1, logistics: 1, environment: 1 },
      { department: 'A', medical: 4, nursing: 4, logistics: 4, environment: 4 },
    ];
    const r = departmentRanking(rows);
    expect(r[0].department).toBe('A');
    expect(r[0].avg).toBe(4.5);
    expect(r[1].avg).toBe(1);
  });
});

describe('lowDimension', () => {
  it('均分低于阈值的维度', () => {
    expect(lowDimension({ medical: 4, nursing: 2, logistics: 3, environment: 5 })).toEqual(['nursing', 'logistics']);
  });
  it('无低分返回空', () => {
    expect(lowDimension({ medical: 4, nursing: 4, logistics: 4, environment: 4 })).toEqual([]);
  });
});

/* ========================================================================== */
/* M141-B · 匿名患者满意度调查（患者敢说真话）                                  */
/* ========================================================================== */

const PERIOD = '2099-03'; // 远未来月份：报告断言不受其他用例台账干扰

/** 构造一份合法六维评分 */
function fullScores(over: Partial<Record<SatisfactionDimensionKey, number>> = {}) {
  return {
    registration_convenience: 4,
    doctor_attitude: 5,
    nurse_attitude: 4,
    environment_comfort: 4,
    wait_time: 3,
    cost_transparency: 4,
    ...over,
  } satisfies Record<SatisfactionDimensionKey, number>;
}

describe('M141-B createSurvey 匿名问卷生成', () => {
  it('返回六维度题目（挂号/医生/护士/环境/等待/费用），量表 1-5', () => {
    const q = createSurvey('visit-001');
    expect(q.dimensions).toHaveLength(6);
    expect(q.dimensions.map((d) => d.key)).toEqual([
      'registration_convenience',
      'doctor_attitude',
      'nurse_attitude',
      'environment_comfort',
      'wait_time',
      'cost_transparency',
    ]);
    expect(q.dimensions.map((d) => d.label)).toEqual([
      '挂号便捷度',
      '医生态度',
      '护士态度',
      '环境舒适度',
      '等待时间',
      '费用透明度',
    ]);
    for (const d of q.dimensions) {
      expect(d.scaleMin).toBe(1);
      expect(d.scaleMax).toBe(5);
    }
  });

  it('【质量与安全】visitId 不回传明文，仅返回 SHA-256 哈希（64 位 hex）', () => {
    const q = createSurvey('visit-secret-xyz');
    expect(q.visitIdHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(q)).not.toContain('visit-secret-xyz');
    expect(JSON.stringify(q)).not.toContain('patient');
  });

  it('相同 visitId 产出相同哈希（一次就诊仅一份问卷的去重依据）', () => {
    const a = createSurvey('visit-same');
    const b = createSurvey('visit-same');
    expect(a.visitIdHash).toBe(b.visitIdHash);
  });

  it('空 visitId 抛错', () => {
    expect(() => createSurvey('')).toThrow(/visitId/);
    expect(() => createSurvey('   ')).toThrow(/visitId/);
  });
});

describe('M141-B analyzeSatisfaction 评分分析', () => {
  it('按月份切片：统计问卷数、整体均分、分维度均分', () => {
    submitAnonymousSurvey({
      visitId: 'v-a1', deptCode: 'outpatient',
      scores: fullScores({ wait_time: 2, cost_transparency: 2 }),
      submittedAt: `${PERIOD}-05T10:00:00Z`,
    });
    submitAnonymousSurvey({
      visitId: 'v-a2', deptCode: 'outpatient',
      scores: fullScores({ wait_time: 3, cost_transparency: 3 }),
      submittedAt: `${PERIOD}-06T10:00:00Z`,
    });
    submitAnonymousSurvey({
      visitId: 'v-a3', deptCode: 'inpatient',
      scores: fullScores({ wait_time: 5, cost_transparency: 5 }),
      submittedAt: `${PERIOD}-07T10:00:00Z`,
    });

    const all = analyzeSatisfaction(PERIOD);
    expect(all.period).toBe(PERIOD);
    expect(all.totalSurveys).toBe(3);
    expect(all.overallAvg).toBeGreaterThan(0);
    expect(all.dimensions).toHaveLength(6);

    const opd = analyzeSatisfaction(PERIOD, 'outpatient');
    expect(opd.totalSurveys).toBe(2);
    expect(opd.deptCode).toBe('outpatient');

    const ipd = analyzeSatisfaction(PERIOD, 'inpatient');
    expect(ipd.totalSurveys).toBe(1);
  });

  it('低分维度识别：均分 < 3.5 的维度进入 lowScoreDimensions，按均分升序', () => {
    submitAnonymousSurvey({
      visitId: 'v-b1', deptCode: 'outpatient',
      scores: fullScores({ wait_time: 1, cost_transparency: 2 }),
      submittedAt: `${PERIOD}-10T10:00:00Z`,
    });
    submitAnonymousSurvey({
      visitId: 'v-b2', deptCode: 'outpatient',
      scores: fullScores({ wait_time: 2, cost_transparency: 2 }),
      submittedAt: `${PERIOD}-11T10:00:00Z`,
    });

    const all = analyzeSatisfaction(PERIOD);
    expect(all.lowScoreDimensions).toContain('wait_time');
    expect(all.lowScoreDimensions).toContain('cost_transparency');
    const first = all.dimensions.find((d) => d.key === all.lowScoreDimensions[0]);
    const second = all.dimensions.find((d) => d.key === all.lowScoreDimensions[1]);
    expect(first!.avgScore).toBeLessThanOrEqual(second!.avgScore);
  });

  it('非法 period 抛错', () => {
    expect(() => analyzeSatisfaction('2026/10')).toThrow(/period/);
    expect(() => analyzeSatisfaction('2026-13')).toThrow(/period/);
  });

  it('空月份返回完整骨架（六维度齐全，count=0）', () => {
    const empty = analyzeSatisfaction('2099-12');
    expect(empty.totalSurveys).toBe(0);
    expect(empty.overallAvg).toBe(0);
    expect(empty.dimensions).toHaveLength(6);
    expect(empty.lowScoreDimensions).toEqual([]);
  });
});

describe('M141-B generateImprovementSuggestions 改进建议', () => {
  it('为每个低分维度生成可落地建议，优先级按出现顺序 high/medium/low', () => {
    const suggestions = generateImprovementSuggestions([
      'wait_time',
      'cost_transparency',
      'doctor_attitude',
    ]);
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].dimension).toBe('wait_time');
    expect(suggestions[0].priority).toBe('high');
    expect(suggestions[0].suggestion).toMatch(/等候/);
    expect(suggestions[1].priority).toBe('medium');
    expect(suggestions[2].priority).toBe('low');
    expect(suggestions.find((s) => s.dimension === 'wait_time')!.dimensionLabel).toBe('等待时间');
  });

  it('空入参返回空数组', () => {
    expect(generateImprovementSuggestions([])).toEqual([]);
  });

  it('重复维度去重', () => {
    const s = generateImprovementSuggestions(['wait_time', 'wait_time', 'wait_time']);
    expect(s).toHaveLength(1);
  });
});

describe('M141-B 维度元数据完整性', () => {
  it('六维度与 SQL 列名一一对应', () => {
    expect(SATISFACTION_DIMENSIONS.map((d) => d.key)).toEqual([
      'registration_convenience',
      'doctor_attitude',
      'nurse_attitude',
      'environment_comfort',
      'wait_time',
      'cost_transparency',
    ]);
  });
});
