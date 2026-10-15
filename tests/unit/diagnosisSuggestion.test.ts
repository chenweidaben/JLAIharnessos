/**
 * 健澜科技 jlmedaios - 智能诊断建议单测（M126-B）
 *
 * 纯函数、确定性、无 I/O。覆盖诊断推荐 / 概率排序 / 鉴别建议 / 危险警示 / 兜底与脱敏。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  generateDiagnosisSuggestions,
  type DiagnosisLabInput,
  type DiagnosisSymptomInput,
} from '../../src/bff/aggregators/diagnosisSuggestionAggregator.js';

const LAB = (markerCode: string, value: number, refHigh: number | null = null, refLow: number | null = null): DiagnosisLabInput => ({
  markerCode, markerName: markerCode, value, unit: '', refLow, refHigh,
});

describe('M126-B 诊断推荐', () => {
  it('发热+咳嗽+咳痰+气促 伴 WBC/NEUT/CRP 升高 -> 社区获得性肺炎排第一', () => {
    const symptoms: DiagnosisSymptomInput[] = [
      { name: '发热' }, { name: '咳嗽' }, { name: '咳痰' }, { name: '气促' },
    ];
    const labs = [LAB('WBC', 13.5, 10, 4), LAB('NEUT', 11.2, 7, 2), LAB('CRP', 45, 10, 0)];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, labs, {});
    expect(r.candidates.length).toBeGreaterThanOrEqual(1);
    expect(r.candidates[0].diagnosis).toBe('社区获得性肺炎');
  });

  it('胸痛+压榨+放射+大汗 -> 心源性诊断居前', () => {
    const symptoms: DiagnosisSymptomInput[] = [
      { name: '胸痛', onset: '压榨样，放射至左肩，伴大汗' },
    ];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, [], {});
    const top = r.candidates.map((c) => c.diagnosis);
    expect(top[0]).toContain('冠心病');
  });

  it('偏瘫+言语不清 -> 缺血性脑卒中进入候选', () => {
    const symptoms: DiagnosisSymptomInput[] = [{ name: '偏瘫' }, { name: '言语不清' }];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, [], {});
    expect(r.candidates.some((c) => c.diagnosis.includes('脑卒中'))).toBe(true);
  });
});

describe('M126-B 概率计算与排序', () => {
  it('返回 Top3、rank 从1递增、概率严格递减', () => {
    const symptoms: DiagnosisSymptomInput[] = [
      { name: '发热' }, { name: '咳嗽' }, { name: '咳痰' }, { name: '气促' },
    ];
    const labs = [LAB('WBC', 13.5, 10, 4), LAB('CRP', 45, 10, 0)];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, labs, {});
    expect(r.candidates.length).toBeLessThanOrEqual(3);
    r.candidates.forEach((c, i) => {
      expect(c.rank).toBe(i + 1);
      expect(c.probability).toBeGreaterThan(0);
      expect(c.probability).toBeLessThanOrEqual(1);
    });
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i - 1].probability).toBeGreaterThanOrEqual(r.candidates[i].probability);
    }
  });

  it('候选概率在返回集合内归一化（和约等于1）', () => {
    const symptoms: DiagnosisSymptomInput[] = [{ name: '胸痛' }];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, [], {});
    const sum = r.candidates.reduce((acc, c) => acc + c.probability, 0);
    expect(Math.abs(sum - 1)).toBeLessThanOrEqual(0.05);
  });
});

describe('M126-B 鉴别检查建议', () => {
  it('每个候选诊断都带下一步鉴别检查', () => {
    const symptoms: DiagnosisSymptomInput[] = [
      { name: '发热' }, { name: '咳嗽' }, { name: '咳痰' }, { name: '气促' },
    ];
    const labs = [LAB('WBC', 13.5, 10, 4), LAB('CRP', 45, 10, 0)];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, labs, {});
    for (const c of r.candidates) {
      expect(c.differentialExams.length).toBeGreaterThan(0);
      expect(c.supportingEvidence.length).toBeGreaterThan(0);
    }
    expect(r.candidates[0].differentialExams.join('、')).toContain('胸部');
  });
});

describe('M126-B 危险警示', () => {
  it('高危胸痛（压榨+大汗）-> critical 警示', () => {
    const symptoms: DiagnosisSymptomInput[] = [{ name: '胸痛', onset: '压榨样持续不缓解伴大汗' }];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, [], {});
    const crit = r.warnings.find((w) => w.level === 'critical');
    expect(crit).toBeDefined();
    expect(crit?.title).toContain('高危胸痛');
  });

  it('卒中红旗 -> critical 急诊警示', () => {
    const symptoms: DiagnosisSymptomInput[] = [{ name: '偏瘫' }, { name: '言语不清' }, { name: '口角歪斜' }];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, [], {});
    expect(r.warnings.some((w) => w.level === 'critical' && w.title.includes('脑卒中'))).toBe(true);
  });

  it('呕血+黑便 -> 消化道出血 critical 警示', () => {
    const symptoms: DiagnosisSymptomInput[] = [{ name: '黑便' }, { name: '呕血' }];
    const labs = [LAB('HGB', 80, 150, 115)];
    const r = generateDiagnosisSuggestions('pat_demo_0001', symptoms, labs, {});
    expect(r.warnings.some((w) => w.level === 'critical' && w.title.includes('消化道出血'))).toBe(true);
  });
});

describe('M126-B 兜底与输出契约', () => {
  it('无任何输入 -> 待查兜底，单候选概率1', () => {
    const r = generateDiagnosisSuggestions('pat_demo_0001', [], [], {});
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].diagnosis).toContain('待查');
    expect(r.candidates[0].probability).toBe(1);
  });

  it('患者标识脱敏、免责声明、生成时间齐全', () => {
    const r = generateDiagnosisSuggestions('pat_demo_0001', [{ name: '胸痛' }], [], {});
    expect(r.patientIdMasked).toBe('***0001');
    expect(r.patientIdMasked).not.toContain('demo');
    expect(r.disclaimer).toContain('不构成医疗建议');
    expect(typeof r.generatedAt).toBe('string');
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
