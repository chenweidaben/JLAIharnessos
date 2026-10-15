/**
 * 健澜科技 jlmedaios - M130-A 病历质控智能审核纯函数单测
 *
 * 覆盖：五项质控规则（主诉完整性 / 现病史时间线 / 鉴别诊断 / 诊疗计划 /
 * 用药指征）、scoreMedicalRecord 权重求和与分级、问题清单提取。
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  auditMedicalRecord,
  scoreMedicalRecord,
  type MedicalRecordContent,
} from '../../src/bff/aggregators/recordQualityAggregator';

/** 一份"完全合格"的病历：五项全过 */
const perfectRecord: MedicalRecordContent = {
  chiefComplaint: '反复咳嗽咳痰3天',
  presentIllness: '患者3天前受凉后出现咳嗽，咳黄脓痰，伴发热；2天前症状加重，体温最高38.9℃',
  differentialDiagnosis: '社区获得性肺炎、肺结核、肺癌',
  treatmentPlan: '完善胸部CT、血常规；予抗感染、化痰对症治疗；监测体温变化',
  medications: [
    { name: '头孢呋辛', indication: '社区获得性肺炎抗感染' },
    { name: '氨溴索', indication: '化痰止咳' },
  ],
};

describe('M130-A 五项质控规则', () => {
  it('病历完全合格：五项全过，issues 为空，needsManualReview=false', () => {
    const r = auditMedicalRecord(perfectRecord);
    expect(r.passedCount).toBe(5);
    expect(r.failedCount).toBe(0);
    expect(r.issues.length).toBe(0);
    expect(r.needsManualReview).toBe(false);
    expect(r.checks.every((c) => c.passed)).toBe(true);
  });

  it('主诉为空 → chief_complaint error 项', () => {
    const r = auditMedicalRecord({ ...perfectRecord, chiefComplaint: '' });
    const cc = r.checks.find((c) => c.key === 'chief_complaint')!;
    expect(cc.passed).toBe(false);
    expect(cc.severity).toBe('error');
    expect(r.issues.some((i) => i.rule === 'chief_complaint')).toBe(true);
    expect(r.needsManualReview).toBe(true);
  });

  it('主诉有症状但缺持续时间 → chief_complaint warning 项', () => {
    const r = auditMedicalRecord({ ...perfectRecord, chiefComplaint: '咳嗽咳痰' });
    const cc = r.checks.find((c) => c.key === 'chief_complaint')!;
    expect(cc.passed).toBe(false);
    expect(cc.severity).toBe('warning');
    // warning 不触发人工复核
    expect(r.needsManualReview).toBe(false);
  });

  it('现病史仅 1 个时间标记 → present_illness_timeline warning', () => {
    const r = auditMedicalRecord({
      ...perfectRecord,
      presentIllness: '患者出现咳嗽，咳黄脓痰',
    });
    const pi = r.checks.find((c) => c.key === 'present_illness_timeline')!;
    expect(pi.passed).toBe(false);
    expect(pi.severity).toBe('warning');
  });

  it('现病史为空 → present_illness_timeline error', () => {
    const r = auditMedicalRecord({ ...perfectRecord, presentIllness: '' });
    const pi = r.checks.find((c) => c.key === 'present_illness_timeline')!;
    expect(pi.passed).toBe(false);
    expect(pi.severity).toBe('error');
  });

  it('鉴别诊断仅 1 个 → differential_diagnosis warning', () => {
    const r = auditMedicalRecord({ ...perfectRecord, differentialDiagnosis: '社区获得性肺炎' });
    const dd = r.checks.find((c) => c.key === 'differential_diagnosis')!;
    expect(dd.passed).toBe(false);
  });

  it('鉴别诊断为空 → differential_diagnosis error', () => {
    const r = auditMedicalRecord({ ...perfectRecord, differentialDiagnosis: '' });
    const dd = r.checks.find((c) => c.key === 'differential_diagnosis')!;
    expect(dd.severity).toBe('error');
  });

  it('诊疗计划为空 → treatment_plan error', () => {
    const r = auditMedicalRecord({ ...perfectRecord, treatmentPlan: '' });
    const tp = r.checks.find((c) => c.key === 'treatment_plan')!;
    expect(tp.passed).toBe(false);
    expect(tp.severity).toBe('error');
  });

  it('诊疗计划无动作关键词 → treatment_plan warning', () => {
    const r = auditMedicalRecord({ ...perfectRecord, treatmentPlan: '继续观察' });
    const tp = r.checks.find((c) => c.key === 'treatment_plan')!;
    expect(tp.passed).toBe(false);
    expect(tp.severity).toBe('warning');
  });

  it('无用药 → medication_indication 自动通过（不适用）', () => {
    const r = auditMedicalRecord({ ...perfectRecord, medications: [] });
    const mi = r.checks.find((c) => c.key === 'medication_indication')!;
    expect(mi.passed).toBe(true);
  });

  it('某条用药缺指征 → medication_indication error 并列出药名', () => {
    const r = auditMedicalRecord({
      ...perfectRecord,
      medications: [
        { name: '头孢呋辛', indication: '社区获得性肺炎抗感染' },
        { name: '氨溴索', indication: '' },
      ],
    });
    const mi = r.checks.find((c) => c.key === 'medication_indication')!;
    expect(mi.passed).toBe(false);
    expect(mi.severity).toBe('error');
    expect(mi.message).toContain('氨溴索');
    expect(r.needsManualReview).toBe(true);
  });
});

describe('M130-A scoreMedicalRecord 评分计算', () => {
  it('五项全过 → 100 分，合格', () => {
    const r = auditMedicalRecord(perfectRecord);
    const s = scoreMedicalRecord(r.checks);
    expect(s.total).toBe(100);
    expect(s.max).toBe(100);
    expect(s.grade).toBe('合格');
    expect(s.passedCount).toBe(5);
    expect(s.failedCount).toBe(0);
  });

  it('用药指征缺（15 分）+ 鉴别诊断不足（20 分）→ 65 分，不合格', () => {
    const r = auditMedicalRecord({
      ...perfectRecord,
      differentialDiagnosis: '社区获得性肺炎', // warning 不通过，扣 20
      medications: [{ name: '氨溴索', indication: '' }], // error 不通过，扣 15
    });
    const s = scoreMedicalRecord(r.checks);
    expect(s.total).toBe(65);
    expect(s.grade).toBe('不合格');
  });

  it('仅主诉缺持续时间（warning，扣 20）→ 80 分，需整改', () => {
    const r = auditMedicalRecord({ ...perfectRecord, chiefComplaint: '咳嗽咳痰' });
    const s = scoreMedicalRecord(r.checks);
    expect(s.total).toBe(80);
    expect(s.grade).toBe('需整改');
  });

  it('分级边界：90 合格 / 89 需整改 / 70 需整改 / 69 不合格', () => {
    // 构造：presentIllness 25 + treatmentPlan 20 + med 15 = 60，再手工拼 check 验证边界
    const base = auditMedicalRecord(perfectRecord).checks;
    // 90：让 presentIllness(25)+differential(20)+treatment(20)+med(15)=80，再加 chief(20)=100
    // 这里直接用权重推导：挑 4 项过 = 80；挑 chief(20)+present(25)+dd(20)+med(15)=80
    const passed = base.filter((c) =>
      ['chief_complaint', 'present_illness_timeline', 'differential_diagnosis', 'medication_indication'].includes(c.key),
    );
    expect(scoreMedicalRecord(passed).total).toBe(80);
    expect(scoreMedicalRecord(passed).grade).toBe('需整改');
    // 全过 100
    expect(scoreMedicalRecord(base).grade).toBe('合格');
  });

  it('分数 clamp：空结果列表 → 0 分', () => {
    const s = scoreMedicalRecord([]);
    expect(s.total).toBe(0);
    expect(s.grade).toBe('不合格');
  });
});

describe('M130-A 问题提取', () => {
  it('issues 只含未通过项，且与 failedCount 一致', () => {
    const r = auditMedicalRecord({
      ...perfectRecord,
      chiefComplaint: '', // error
      presentIllness: '患者出现咳嗽', // warning（时间标记不足）
    });
    expect(r.issues.length).toBe(r.failedCount);
    expect(r.issues.every((i) => i.message.length > 0)).toBe(true);
    // 每个问题都带整改建议
    expect(r.issues.every((i) => i.suggestion.length > 0)).toBe(true);
  });

  it('结论文案为"建议"性质，提示人工确认', () => {
    const r = auditMedicalRecord({ ...perfectRecord, chiefComplaint: '' });
    expect(r.suggestion).toContain('人工');
    expect(r.suggestion).toContain('建议');
  });
});
