/**
 * 健澜科技 jlmedaios - 病历质控规则引擎单元测试（M2-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  evaluateRecord,
  getSectionText,
  TIMELINESS_RULES,
  type RecordLike,
} from '../../../src/knowledge/qc/medicalRecordQc.js';

const now = '2026-09-27T10:00:00.000Z';

const goodOutpatientContent = {
  chiefComplaint: '反复头晕3天',
  presentIllness: '患者3天前无明显诱因出现头晕，伴恶心，无呕吐，症状持续不缓解，今日来我院门诊就诊。',
  pastHistory: '高血压病史5年，规律服药。',
  physicalExam: 'T36.5 P80次/分 R18次/分 BP140/90mmHg，神清，心肺腹查体未见明显异常。',
  auxiliaryExam: '暂缺',
  diagnosis: '头晕待查',
  treatment: '对症处理，注意休息，门诊随诊',
};

function record(partial: Partial<RecordLike>): RecordLike {
  return {
    recordType: 'outpatient',
    content: goodOutpatientContent,
    plainText: null,
    authorId: 'u-1',
    createdAt: now,
    ...partial,
  };
}

describe('病历质控规则引擎', () => {
  it('完整门诊病历：无阻断/主要问题，建议通过，满分', () => {
    const r = evaluateRecord(record({}));
    expect(r.canPass).toBe(true);
    expect(r.blockCount).toBe(0);
    expect(r.majorCount).toBe(0);
    expect(r.score).toBe(100);
  });

  it('缺少主诉：阻断缺陷，不能通过', () => {
    const content = { ...goodOutpatientContent, chiefComplaint: '' };
    const r = evaluateRecord(record({ content }));
    expect(r.blockCount).toBeGreaterThan(0);
    expect(r.canPass).toBe(false);
    expect(r.issues.some((i) => i.ruleId.includes('chiefComplaint.missing'))).toBe(true);
  });

  it('现病史过短：主要缺陷', () => {
    const content = { ...goodOutpatientContent, presentIllness: '头晕' };
    const r = evaluateRecord(record({ content }));
    expect(r.majorCount).toBeGreaterThan(0);
    expect(r.canPass).toBe(false);
  });

  it('缺少可选段落（辅助检查）：仅次要提示', () => {
    const content = { ...goodOutpatientContent, auxiliaryExam: '' };
    const r = evaluateRecord(record({ content }));
    expect(r.minorCount).toBeGreaterThan(0);
    expect(r.majorCount).toBe(0);
    expect(r.blockCount).toBe(0);
  });

  it('病历正文近乎空白：阻断', () => {
    const r = evaluateRecord(record({ content: { chiefComplaint: 'x' }, plainText: 'x' }));
    expect(r.blockCount).toBeGreaterThan(0);
    expect(r.issues.some((i) => i.ruleId === 'record.empty')).toBe(true);
  });

  it('缺少作者签名：主要缺陷', () => {
    const r = evaluateRecord(record({ authorId: null }));
    expect(r.majorCount).toBeGreaterThan(0);
    expect(r.issues.some((i) => i.ruleId === 'record.author.missing')).toBe(true);
  });

  it('入院记录超时（>24h）：时限主要缺陷；按时完成则无', () => {
    const base = record({ recordType: 'admission', createdAt: now });
    const late = evaluateRecord(base, {
      eventTime: '2026-09-25T10:00:00.000Z',
      deadlineHours: TIMELINESS_RULES.admission.deadlineHours,
      eventLabel: '入院记录',
    });
    expect(late.issues.some((i) => i.ruleId === 'record.timeliness.overdue')).toBe(true);
    expect(late.canPass).toBe(false);

    const onTime = evaluateRecord(base, {
      eventTime: '2026-09-27T08:00:00.000Z',
      deadlineHours: 24,
    });
    expect(onTime.issues.some((i) => i.ruleId === 'record.timeliness.overdue')).toBe(false);
  });

  it('手术记录：缺少必备要素逐项阻断', () => {
    const operativeContent = {
      preOpDiagnosis: '急性阑尾炎',
      postOpDiagnosis: '急性化脓性阑尾炎',
      surgeryName: '腹腔镜阑尾切除术',
      surgeon: '张医师',
      anesthesia: '全麻',
      procedureDescription: '麻醉成功后患者取仰卧位，常规消毒铺巾，脐部做1cm切口建立气腹，置入腹腔镜及操作器械；探查见阑尾充血肿胀、表面脓苔，符合化脓性阑尾炎；分离阑尾系膜至根部，夹闭后顺行切除阑尾，取出标本，彻底止血，清点纱布器械无误，缝合各切口，术毕安返病房。',
    };
    const good = evaluateRecord(record({ recordType: 'operative', content: operativeContent }));
    expect(good.canPass).toBe(true);

    const lacking = evaluateRecord(
      record({ recordType: 'operative', content: { ...operativeContent, surgeon: '' } }),
    );
    expect(lacking.blockCount).toBeGreaterThan(0);
  });

  it('出院记录：缺少出院医嘱等必备段落阻断', () => {
    const dischargeContent = {
      admissionDate: '2026-09-20',
      dischargeDate: '2026-09-27',
      admissionDiagnosis: '肺炎',
      dischargeDiagnosis: '肺炎治愈',
      hospitalCourse: '入院后完善血常规、胸片等相关检查，明确诊断后予经验性抗感染、雾化祛痰及补液对症支持治疗；治疗期间监测体温及炎症指标变化，患者咳嗽咳痰逐步缓解，体温恢复正常，复查血常规及胸片提示炎症基本吸收，达到出院标准。',
      dischargeCondition: '一般情况好，无发热、咳嗽。',
      dischargeOrders: '注意休息，1周后门诊复查胸片。',
    };
    const good = evaluateRecord(record({ recordType: 'discharge', content: dischargeContent }));
    expect(good.canPass).toBe(true);

    const lacking = evaluateRecord(
      record({ recordType: 'discharge', content: { ...dischargeContent, dischargeOrders: '' } }),
    );
    expect(lacking.blockCount).toBeGreaterThan(0);
  });

  it('病程记录：以正文长度判定，过短为主要缺陷', () => {
    const good = evaluateRecord(
      record({ recordType: 'progress', content: {}, plainText: '今日患者头晕较前明显缓解，无恶心呕吐，无头痛及肢体无力，精神食欲睡眠可，大小便正常。查体神经系统未见定位体征，继续当前治疗方案，密切观察病情变化，必要时复查头颅及相关检验指标。' }),
    );
    expect(good.canPass).toBe(true);
    const short = evaluateRecord(record({ recordType: 'progress', content: {}, plainText: '病情稳定' }));
    expect(short.blockCount + short.majorCount).toBeGreaterThan(0);
  });

  it('getSectionText：兼容别名与嵌套 sections', () => {
    expect(getSectionText({ chief_complaint: '胸痛2h' }, ['chiefComplaint', 'chief_complaint'])).toBe('胸痛2h');
    expect(
      getSectionText({ sections: { physicalExam: '心肺无异常' } }, ['physicalExam']),
    ).toBe('心肺无异常');
    expect(getSectionText({ a: 1 }, ['b'])).toBe('');
  });

  it('全部问题标注 source=rule', () => {
    const r = evaluateRecord(record({ content: {} }));
    expect(r.issues.every((i) => i.source === 'rule')).toBe(true);
  });
});