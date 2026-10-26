/**
 * S-09 门诊/住院共用报告解读组件单测（4.2 节共用单一实现，S-10 直接复用）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import {
  interpretClinicalReport,
  CLINICAL_INTERPRETATION_DISCLAIMER,
} from '@/bff/agents/shared/clinicalReportInterpretation.js';
import { demoCitations } from '../outpatient/fixtures.js';

describe('共用报告解读 interpretClinicalReport', () => {
  it('医生版：异常项标注方向、危急值单列、复核建议齐备', () => {
    const result = interpretClinicalReport({
      reportKind: 'lab',
      audience: 'doctor',
      citations: demoCitations,
      focus: '血常规与电解质',
      items: [
        { item: '白细胞计数', value: '12.5', referenceRange: '4.0-10.0', abnormalFlag: 'high' },
        { item: '血钾', value: '2.8', referenceRange: '3.5-5.5', abnormalFlag: 'critical' },
        { item: '血红蛋白', value: '130', referenceRange: '115-150', abnormalFlag: 'normal' },
      ],
    });
    expect(result.abnormalFindings.length).toBe(2);
    expect(result.criticalAlerts.length).toBe(1);
    expect(result.criticalAlerts[0]).toContain('血钾');
    expect(result.recommendations.length).toBe(2);
    expect(result.abnormalFindings[0].plainLanguageNote).toContain('参考范围');
    expect(result.evidenceLevel).toBe('supported');  });

  it('患者版：措辞通俗温和，危急值提醒保留', () => {
    const doctor = interpretClinicalReport({
      reportKind: 'lab',
      audience: 'doctor',
      citations: demoCitations,
      items: [{ item: '血钾', value: '2.8', referenceRange: '3.5-5.5', abnormalFlag: 'critical' }],
    });
    const patient = interpretClinicalReport({
      reportKind: 'lab',
      audience: 'patient',
      citations: demoCitations,
      items: [{ item: '血钾', value: '2.8', referenceRange: '3.5-5.5', abnormalFlag: 'critical' }],
    });
    expect(patient.abnormalFindings[0].plainLanguageNote === doctor.abnormalFindings[0].plainLanguageNote).toBe(false);
    expect(patient.abnormalFindings[0].plainLanguageNote).toContain('请勿自行判断');
    expect(patient.criticalAlerts.length).toBe(1);
  });

  it('无引用证据：evidenceLevel=none，摘要标注（待核实）并附固定免责声明', () => {
    const result = interpretClinicalReport({
      reportKind: 'exam',
      audience: 'doctor',
      citations: [],
      items: [{ item: '血压', value: '150/95', referenceRange: '90-140/60-90', abnormalFlag: 'high' }],
    });
    expect(result.evidenceLevel).toBe('none');
    expect(result.summary.startsWith('（待核实）')).toBe(true);
    expect(result.disclaimer).toBe(CLINICAL_INTERPRETATION_DISCLAIMER);
    expect(result.disclaimer).toContain('不作为诊断依据');
  });

  it('正常项目不进入异常清单，引用清单原样透传', () => {
    const result = interpretClinicalReport({
      reportKind: 'imaging',
      audience: 'doctor',
      citations: demoCitations,
      items: [{ item: '胸部 CT', value: '未见明显异常', abnormalFlag: 'normal' }],
    });
    expect(result.abnormalFindings).toEqual([]);
    expect(result.criticalAlerts).toEqual([]);
    expect(result.citations).toEqual(demoCitations);
  });

  it('门诊流程内调用本组件返回结构稳定（证明单一实现两侧可复用）', () => {
    const result = interpretClinicalReport({
      reportKind: 'lab',
      audience: 'doctor',
      citations: demoCitations,
      items: [{ item: '血红蛋白', value: '95', referenceRange: '115-150', abnormalFlag: 'low' }],
    });
    expect(Object.keys(result).sort()).toEqual(
      ['abnormalFindings', 'citations', 'criticalAlerts', 'disclaimer', 'evidenceLevel', 'recommendations', 'summary'].sort(),
    );
    expect(result.abnormalFindings[0].direction).toBe('low');
    expect(result.abnormalFindings[0].critical).toBe(false);
  });
});
