/**
 * 健澜科技 jlmedaios - M144-B AI 病历自动生成 纯函数单测
 *
 * 【AI核心能力深化】覆盖：
 *  - 病历生成：返回 id / visitId / 六段 sections / 整稿 content / 免责声明 / 模型版本；
 *  - 结构完整性：口述进入主诉与现病史、诊断术语抽取进初步诊断、规则包命中处理意见；
 *  - 患者标识脱敏：原始 patientId 不回显明文，首尾各两位加星号掩码；
 *  - 空输入兜底：空口述→主诉待补充、空诊断→待明确；
 *  - 修改学习：医师修改复核后逐段 diff 留痕、各段被修改累计次数正确、未改段不变。
 *
 * 全部使用 mock 数据，纯函数、不依赖数据库与外部 LLM。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it, beforeEach } from 'bun:test';

import {
  generateMedicalRecord,
  improveMedicalRecord,
  getLearningSummary,
  resetLearningStore,
  computeSectionDiff,
  AI_RECORD_MODEL_VERSION,
  AI_RECORD_DISCLAIMER,
  type AiRecordGenSections,
} from '../../src/bff/aggregators/aiRecordAggregator';

const baseNotes = ['咳嗽咳痰3天', '发热1天', '社区获得性肺炎'];
const basePatient = {
  patientId: 'pat_demo_0001',
  gender: '男',
  age: 62,
  department: '呼吸内科',
};

describe('M144-B AI 病历自动生成（六段式规则引擎）', () => {
  beforeEach(() => {
    resetLearningStore();
  });

  it('病历生成：返回 id、visitId、六段 sections、整稿 content、免责声明与模型版本', () => {
    const draft = generateMedicalRecord('vis_m144_01', baseNotes, basePatient);
    expect(draft.id).toBe('air_vis_m144_01');
    expect(draft.visitId).toBe('vis_m144_01');
    expect(draft.modelVersion).toBe(AI_RECORD_MODEL_VERSION);
    expect(draft.disclaimer).toBe(AI_RECORD_DISCLAIMER);
    expect(draft.sections.chiefComplaint).toBeTruthy();
    expect(draft.sections.presentIllness).toBeTruthy();
    expect(draft.sections.pastHistory).toBeTruthy();
    expect(draft.sections.physicalExam).toBeTruthy();
    expect(draft.sections.diagnosis).toBeTruthy();
    expect(draft.sections.treatmentPlan).toBeTruthy();
    expect(draft.content.length).toBeGreaterThan(100);
  });

  it('格式规范：整稿含全部六个段名标签', () => {
    const draft = generateMedicalRecord('vis_m144_02', baseNotes, basePatient);
    for (const label of ['主诉：', '现病史：', '既往史：', '体格检查：', '初步诊断：', '处理意见：']) {
      expect(draft.content).toContain(label);
    }
    expect(draft.content).toContain(AI_RECORD_DISCLAIMER);
  });

  it('结构完整性：首行进主诉，口述进现病史，诊断术语抽取进初步诊断，规则包命中处理意见', () => {
    const draft = generateMedicalRecord('vis_m144_03', baseNotes, basePatient);
    expect(draft.sections.chiefComplaint).toContain('咳嗽咳痰3天');
    expect(draft.sections.presentIllness).toContain('咳嗽咳痰3天');
    expect(draft.sections.diagnosis).toContain('社区获得性肺炎');
    // 诊断含「肺炎」→ 处理意见命中抗感染规则包
    expect(draft.sections.treatmentPlan).toContain('抗感染');
  });

  it('患者标识脱敏：原始 patientId 不回显明文，输出首尾各两位加星号掩码', () => {
    const draft = generateMedicalRecord('vis_m144_04', baseNotes, basePatient);
    expect(draft.patientIdMasked).toBe('pa****01');
    expect(draft.content).not.toContain('pat_demo_0001');
    expect(draft.content).toContain(draft.patientIdMasked);
  });

  it('空输入兜底：空口述→主诉待补充、现病史待补充，空诊断→待明确', () => {
    const draft = generateMedicalRecord('vis_m144_05', '', {});
    expect(draft.sections.chiefComplaint).toContain('待补充');
    expect(draft.sections.presentIllness).toContain('待补充');
    expect(draft.sections.diagnosis).toContain('待明确');
  });

  it('纯函数：同参多次调用生成的 sections 文本一致（确定性）', () => {
    const a = generateMedicalRecord('vis_m144_06', baseNotes, basePatient);
    const b = generateMedicalRecord('vis_m144_06', baseNotes, basePatient);
    expect(a.sections).toEqual(b.sections);
    expect(a.content).toBe(b.content);
  });
});

describe('M144-B 医师修改后用于模型优化（diff 留痕 + 学习信号）', () => {
  beforeEach(() => {
    resetLearningStore();
  });

  it('修改学习：医师修改初步诊断后，逐段 diff 留痕且该段学习计数 +1', () => {
    const draft = generateMedicalRecord('vis_m144_10', baseNotes, basePatient);

    // 医师复核：补充分型，仅修改初步诊断，其余段不动
    const revised: AiRecordGenSections = {
      ...draft.sections,
      diagnosis: '社区获得性肺炎（普通型）',
    };
    improveMedicalRecord(draft.id, { sections: revised, note: '补充分型' });

    const summary = getLearningSummary();
    expect(summary.totalRevised).toBe(1);
    // 初步诊断被修改，计数 +1
    expect(summary.sectionEditCounts['初步诊断']).toBe(1);
    // 其余段未修改，计数为 0
    expect(summary.sectionEditCounts['主诉']).toBe(0);
    expect(summary.sectionEditCounts['处理意见']).toBe(0);

    const entry = summary.entries[0];
    expect(entry.recordId).toBe(draft.id);
    expect(entry.changedSections).toContain('diagnosis');
    const diff = entry.diff.find((d) => d.section === 'diagnosis');
    expect(diff?.changed).toBe(true);
    expect(diff?.before).toContain('社区获得性肺炎');
    expect(diff?.after).toContain('普通型');
    // 未修改段 changed=false
    const unchanged = entry.diff.find((d) => d.section === 'pastHistory');
    expect(unchanged?.changed).toBe(false);
  });

  it('computeSectionDiff：逐段比较 before/after，changed 标记正确', () => {
    const before: AiRecordGenSections = {
      chiefComplaint: '头痛2天',
      presentIllness: '头痛2天就诊',
      pastHistory: '体健',
      physicalExam: '神清',
      diagnosis: '偏头痛',
      treatmentPlan: '对症',
    };
    const after: AiRecordGenSections = { ...before, diagnosis: '偏头痛；睡眠障碍' };
    const diff = computeSectionDiff(before, after);
    expect(diff.filter((d) => d.changed).map((d) => d.section)).toEqual(['diagnosis']);
    expect(diff.find((d) => d.section === 'diagnosis')?.after).toContain('睡眠障碍');
  });

  it('连续多次修改：学习计数按段累加', () => {
    const d1 = generateMedicalRecord('vis_m144_11', baseNotes, basePatient);
    improveMedicalRecord(d1.id, {
      sections: { ...d1.sections, treatmentPlan: '调整为口服抗生素方案' },
    });
    improveMedicalRecord(d1.id, {
      sections: { ...d1.sections, treatmentPlan: '调整为静脉抗生素方案' },
    });
    const summary = getLearningSummary();
    expect(summary.totalRevised).toBe(2);
    expect(summary.sectionEditCounts['处理意见']).toBe(2);
  });

  it('未知 recordId：before 按空串兜底，仍记录学习样本不抛错', () => {
    improveMedicalRecord('air_not_exists', {
      sections: {
        chiefComplaint: '胸痛1小时',
        presentIllness: '',
        pastHistory: '',
        physicalExam: '',
        diagnosis: '',
        treatmentPlan: '',
      },
    });
    const summary = getLearningSummary();
    expect(summary.totalRevised).toBe(1);
    expect(summary.entries[0].diff.find((d) => d.section === 'chiefComplaint')?.changed).toBe(true);
  });

  it('resetLearningStore：清空后汇总归零', () => {
    const draft = generateMedicalRecord('vis_m144_12', baseNotes, basePatient);
    improveMedicalRecord(draft.id, { sections: { ...draft.sections } });
    expect(getLearningSummary().totalRevised).toBe(1);
    resetLearningStore();
    expect(getLearningSummary().totalRevised).toBe(0);
    expect(getLearningSummary().sectionEditCounts['初步诊断']).toBe(0);
  });
});
