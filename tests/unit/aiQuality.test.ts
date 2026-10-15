/**
 * 健澜科技 jlmedaios - AI 质控智能审核（M144-D）纯函数单测
 *
 * 覆盖：六大核心条款逐项判定、问题分级 critical/major/minor、扣分与通过线、
 * 科室周期报告汇总、学习反馈回流。全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  aiQualityCheck,
  generateQualityReport,
  getQualityLearningRegistry,
  learnFromQualityFeedback,
  type RecordContent,
} from '../../src/bff/aggregators/aiQualityAggregator';

/** 一份六大条款全部达标的病历 */
const perfectRecord: RecordContent = {
  chiefComplaint: '反复咳嗽咳痰3天',
  presentIllness: '患者3天前受凉后出现咳嗽，咳黄脓痰，伴发热，最高体温38.5℃，自服退热药稍缓解',
  diagnosis: '社区获得性肺炎',
  medications: ['阿莫西林胶囊 0.5g  tid', '布洛芬缓释胶囊 0.3g  bid'],
  signed: true,
  signedBy: '张医生',
  recordCreatedAt: '2026-10-16T08:00:00+08:00',
  dueAt: '2026-10-16T18:00:00+08:00',
  dept: '内科',
};

describe('M144-D 六项全达标', () => {
  it('要素齐全：满分 100、passed、零 issue', () => {
    const r = aiQualityCheck('rec-ok-1', perfectRecord);
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.issueCount).toBe(0);
    expect(r.issues.length).toBe(0);
  });
});

describe('M144-D 六项逐项不漏项', () => {
  it('主诉过短 → chief_complaint.incomplete（major）', () => {
    const r = aiQualityCheck('rec-cc', { ...perfectRecord, chiefComplaint: '咳嗽' });
    const issue = r.issues.find((i) => i.rule === 'chief_complaint.incomplete');
    expect(issue?.severity).toBe('major');
  });

  it('现病史过短 → present_illness.insufficient（major）', () => {
    const r = aiQualityCheck('rec-pi', { ...perfectRecord, presentIllness: '不舒服' });
    expect(r.issues.some((i) => i.rule === 'present_illness.insufficient')).toBe(true);
  });

  it('诊断缺失 → diagnosis.unclear（critical）', () => {
    const r = aiQualityCheck('rec-dx', { ...perfectRecord, diagnosis: '' });
    const issue = r.issues.find((i) => i.rule === 'diagnosis.unclear');
    expect(issue?.severity).toBe('critical');
  });

  it('诊断仅写"待查" → diagnosis.unclear（critical）', () => {
    const r = aiQualityCheck('rec-dx2', { ...perfectRecord, diagnosis: '待查' });
    expect(r.issues.some((i) => i.rule === 'diagnosis.unclear')).toBe(true);
  });

  it('用药重复 → medication.duplicate（major）', () => {
    const r = aiQualityCheck('rec-med', {
      ...perfectRecord,
      medications: ['阿莫西林胶囊 0.5g  tid', '阿莫西林胶囊 1.0g  q8h'],
    });
    expect(r.issues.some((i) => i.rule === 'medication.duplicate')).toBe(true);
  });

  it('用药缺剂量 → medication.incomplete_dose（minor）', () => {
    const r = aiQualityCheck('rec-med2', {
      ...perfectRecord,
      medications: ['阿莫西林胶囊'],
    });
    const issue = r.issues.find((i) => i.rule === 'medication.incomplete_dose');
    expect(issue?.severity).toBe('minor');
  });

  it('未签名 → signature.missing（critical）', () => {
    const r = aiQualityCheck('rec-sig', { ...perfectRecord, signed: false, signedBy: '' });
    const issue = r.issues.find((i) => i.rule === 'signature.missing');
    expect(issue?.severity).toBe('critical');
  });

  it('签名人为空 → signature.missing（critical）', () => {
    const r = aiQualityCheck('rec-sig2', { ...perfectRecord, signed: true, signedBy: '' });
    expect(r.issues.some((i) => i.rule === 'signature.missing')).toBe(true);
  });

  it('超时完成 → timeliness.overdue（major）', () => {
    const r = aiQualityCheck('rec-time', {
      ...perfectRecord,
      recordCreatedAt: '2026-10-17T08:00:00+08:00', // 次日才写
      dueAt: '2026-10-16T18:00:00+08:00',
    });
    expect(r.issues.some((i) => i.rule === 'timeliness.overdue')).toBe(true);
  });
});

describe('M144-D 问题分级与扣分', () => {
  it('critical 问题直接导致不通过（即使分数>80）', () => {
    const r = aiQualityCheck('rec-crit', { ...perfectRecord, diagnosis: '' });
    // 仅 diagnosis.unclear 一个 critical，扣 30 → 70 分且有 critical → 不通过
    expect(r.criticalCount).toBe(1);
    expect(r.passed).toBe(false);
    expect(r.score).toBe(70);
  });

  it('major/minor 组合扣分，分数 clamp 在 0-100', () => {
    const r = aiQualityCheck('rec-mix', {
      ...perfectRecord,
      chiefComplaint: '咳',          // major -10
      presentIllness: '短',          // major -10
      medications: ['阿莫西林胶囊'],  // minor -3
    });
    expect(r.majorCount).toBe(2);
    expect(r.minorCount).toBe(1);
    // 100 - 10 - 10 - 3 = 77，无 critical → passed 需 >=80，故不通过
    expect(r.score).toBe(77);
    expect(r.passed).toBe(false);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('单一 minor 不影响通过（97 分、无 critical）', () => {
    const r = aiQualityCheck('rec-minor', {
      ...perfectRecord,
      medications: ['阿莫西林胶囊'],
    });
    expect(r.score).toBe(97);
    expect(r.criticalCount).toBe(0);
    expect(r.passed).toBe(true);
  });
});

describe('M144-D 科室周期报告', () => {
  it('汇总合格率、平均分、分级计数与高频规则', () => {
    const a = aiQualityCheck('r1', perfectRecord);
    const b = aiQualityCheck('r2', { ...perfectRecord, diagnosis: '' }); // critical
    const c = aiQualityCheck('r3', { ...perfectRecord, chiefComplaint: '咳' }); // major
    const report = generateQualityReport('内科', '2026-10', [a, b, c]);

    expect(report.dept).toBe('内科');
    expect(report.period).toBe('2026-10');
    expect(report.totalChecked).toBe(3);
    expect(report.passedCount).toBe(2); // a(100) 与 c(90,无critical) 通过；b 有 critical 不通过
    expect(report.passRate).toBe(66.7);   // 2/3
    expect(report.criticalCount).toBe(1); // b
    expect(report.majorCount).toBe(1);    // c
    expect(report.avgScore).toBeGreaterThan(0);
    expect(report.topRules.length).toBeGreaterThan(0);
  });

  it('空集合报告不抛错、各项为 0', () => {
    const report = generateQualityReport('全院', '全部', []);
    expect(report.totalChecked).toBe(0);
    expect(report.passRate).toBe(0);
    expect(report.avgScore).toBe(0);
    expect(report.topRules).toEqual([]);
  });
});

describe('M144-D 学习反馈回流', () => {
  it('learnFromQualityFeedback 累计误报次数并保留纠正说明', () => {
    learnFromQualityFeedback('rec-learn-1', true, '该病历诊断其实明确');
    learnFromQualityFeedback('rec-learn-1', true, '签名已补');
    learnFromQualityFeedback('rec-learn-1', false, null);

    const entry = getQualityLearningRegistry().find((e) => e.recordId === 'rec-learn-1');
    expect(entry).toBeDefined();
    expect(entry?.feedbackCount).toBe(3);
    expect(entry?.errorCount).toBe(2);
    expect(entry?.lastCorrection).toBe('签名已补'); // 取最近一次非空纠正说明
  });

  it('空 recordId 不写入注册表', () => {
    const before = getQualityLearningRegistry().length;
    learnFromQualityFeedback('', true, 'x');
    expect(getQualityLearningRegistry().length).toBe(before);
  });
});
