/**
 * 健澜科技 jlmedaios - 智能病历草稿生成（M126-A）纯函数单测
 *
 * 覆盖：病历生成（七段结构齐全）、内容完整性（症状/检验/诊断汇入对应段落）、
 * 格式规范（整稿含七段段名与免责声明）、规则包命中（肺炎→抗感染处理意见）、
 * 空输入兜底（空诊断→待明确，空检验→待回报）、患者标识脱敏。
 * 全部使用 mock 数据，纯函数、不依赖数据库与外部 LLM。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  generateMedicalRecordDraft,
  DRAFT_DISCLAIMER,
} from '../../src/bff/aggregators/medicalRecordDraftAggregator';

const basePatient = { patientId: 'pat_demo_0001', gender: '男', age: 62, department: '呼吸内科' };
const baseSymptoms = ['咳嗽咳痰3天', '发热1天'];
const baseLabs = [
  { markerName: '白细胞', value: '13.5', unit: '×10^9/L', abnormal: 'high' as const },
  { markerName: 'C反应蛋白', value: '45', unit: 'mg/L', abnormal: 'high' as const },
  { markerName: '血红蛋白', value: '135', unit: 'g/L', abnormal: 'normal' as const },
];
const baseDiagnosis = ['社区获得性肺炎'];

describe('M126-A 智能病历草稿生成（七段式规则引擎）', () => {
  it('病历生成：返回 visitId、七段 sections、整稿 content、免责声明与模型版本', () => {
    const draft = generateMedicalRecordDraft('vis_0001', basePatient, baseSymptoms, baseLabs, baseDiagnosis);
    expect(draft.visitId).toBe('vis_0001');
    expect(draft.modelVersion).toBe('jlmedaios-record-draft-v1');
    expect(draft.disclaimer).toBe(DRAFT_DISCLAIMER);
    expect(draft.sections.chiefComplaint).toBeTruthy();
    expect(draft.sections.presentIllness).toBeTruthy();
    expect(draft.sections.pastHistory).toBeTruthy();
    expect(draft.sections.physicalExam).toBeTruthy();
    expect(draft.sections.auxiliaryExam).toBeTruthy();
    expect(draft.sections.diagnosis).toBeTruthy();
    expect(draft.sections.treatmentPlan).toBeTruthy();
    expect(draft.content.length).toBeGreaterThan(100);
  });

  it('内容完整性：症状进入现病史，异常检验进入辅助检查，诊断进入初步诊断', () => {
    const draft = generateMedicalRecordDraft('vis_0002', basePatient, baseSymptoms, baseLabs, baseDiagnosis);
    expect(draft.sections.presentIllness).toContain('咳嗽咳痰3天');
    expect(draft.sections.presentIllness).toContain('发热1天');
    // 异常指标逐条列示并标注 ↑
    expect(draft.sections.auxiliaryExam).toContain('白细胞');
    expect(draft.sections.auxiliaryExam).toContain('↑');
    // 正常指标聚合计数
    expect(draft.sections.auxiliaryExam).toContain('其余 1 项');
    expect(draft.sections.diagnosis).toContain('社区获得性肺炎');
  });

  it('格式规范：整稿含全部七个段名标签与 AI 免责声明', () => {
    const draft = generateMedicalRecordDraft('vis_0003', basePatient, baseSymptoms, baseLabs, baseDiagnosis);
    for (const label of ['主诉：', '现病史：', '既往史：', '体格检查：', '辅助检查：', '初步诊断：', '处理意见：']) {
      expect(draft.content).toContain(label);
    }
    expect(draft.content).toContain(DRAFT_DISCLAIMER);
    expect(draft.content).toContain('就诊ID：vis_0003');
  });

  it('规则包命中：诊断含「肺炎」→ 处理意见含抗感染诊疗条目', () => {
    const draft = generateMedicalRecordDraft('vis_0004', basePatient, baseSymptoms, baseLabs, baseDiagnosis);
    expect(draft.sections.treatmentPlan).toContain('抗感染');
    expect(draft.sections.treatmentPlan).toContain('体温');
  });

  it('空输入兜底：空诊断→待明确，空检验→待回报，空症状→待补充', () => {
    const draft = generateMedicalRecordDraft('vis_0005', {}, [], [], []);
    expect(draft.sections.diagnosis).toContain('待明确');
    expect(draft.sections.auxiliaryExam).toContain('待回报');
    expect(draft.sections.chiefComplaint).toContain('待补充');
    expect(draft.sections.presentIllness).toContain('待补充');
  });

  it('患者标识脱敏：原始 patientId 不回显明文，输出首尾各两位加星号掩码', () => {
    const draft = generateMedicalRecordDraft('vis_0006', basePatient, baseSymptoms, baseLabs, baseDiagnosis);
    expect(draft.patientIdMasked).toBe('pa****01');
    expect(draft.content).not.toContain('pat_demo_0001');
    expect(draft.content).toContain(draft.patientIdMasked);
  });

  it('多诊断以分号连接，未命中规则包时走通用支持处理意见', () => {
    const draft = generateMedicalRecordDraft('vis_0007', basePatient, ['头痛2天'], [], ['偏头痛', '睡眠障碍']);
    expect(draft.sections.diagnosis).toBe('偏头痛；睡眠障碍');
    expect(draft.sections.treatmentPlan).toContain('对症支持治疗');
  });
});
