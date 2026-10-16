/**
 * 健澜科技 jlmedaios - 知识图谱 V2 纯函数单测（M208-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDiseaseGraph,
  buildKnowledgeGraphReportV2,
  validateClinicalRule,
  type ClinicalRule,
  type PatientData,
} from '../../src/bff/aggregators/knowledgeGraphReportV2Aggregator';

describe('buildDiseaseGraph', () => {
  it('肺炎 → 发热咳嗽咳痰+抗生素+胸片CT', () => {
    const r = buildDiseaseGraph('肺炎');
    expect(r.symptoms).toContain('发热');
    expect(r.drugs).toContain('抗生素');
    expect(r.exams).toContain('胸片');
  });

  it('高血压 → 头痛头晕+降压药', () => {
    const r = buildDiseaseGraph('高血压');
    expect(r.drugs).toContain('降压药');
  });
});

describe('validateClinicalRule', () => {
  it('收缩压 150 + 高血压规则 → 触发', () => {
    const rule: ClinicalRule = { condition: 'hypertension', action: '提醒服药' };
    const p: PatientData = { age: 50, systolicBp: 150 };
    const r = validateClinicalRule(rule, p);
    expect(r.triggered).toBe(true);
  });

  it('收缩压 120 + 高血压规则 → 不触发', () => {
    const rule: ClinicalRule = { condition: 'hypertension', action: '提醒服药' };
    const p: PatientData = { age: 50, systolicBp: 120 };
    const r = validateClinicalRule(rule, p);
    expect(r.triggered).toBe(false);
  });
});

describe('buildKnowledgeGraphReportV2', () => {
  it('生成图谱数据', () => {
    const r = buildKnowledgeGraphReportV2('30d');
    expect(r.graph.entities).toBeGreaterThan(0);
  });

  it('生成规则数据', () => {
    const r = buildKnowledgeGraphReportV2('30d');
    expect(r.rules.total).toBeGreaterThan(0);
  });

  it('生成质量数据', () => {
    const r = buildKnowledgeGraphReportV2('30d');
    expect(r.quality.accuracy).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildKnowledgeGraphReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
