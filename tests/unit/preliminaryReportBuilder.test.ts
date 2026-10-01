/**
 * 健澜科技 jlmedaios - 预问诊报告生成器单测（M3-P）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, it, expect } from 'bun:test';
import {
  buildPreliminaryReport,
  validatePreliminaryHistory,
  PRELIMINARY_REPORT_DISCLAIMER,
} from '../../src/knowledge/rules/preliminaryReportBuilder';

const full = {
  chiefComplaint: '头痛 3 天',
  presentIllness: '3 天前无明显诱因出现头痛，呈持续性胀痛，伴发热。',
  pastHistory: '高血压病史 5 年',
  medications: '氨氯地平 5mg 每日一次',
  allergies: '青霉素过敏',
  onsetTime: '3 天前',
  accompanyingSymptoms: ['发热', '恶心'],
};

describe('M3-P 预问诊报告生成器', () => {
  it('完整病史：包含全部字段', () => {
    const r = buildPreliminaryReport('神经内科', full);
    expect(r).toContain('神经内科');
    expect(r).toContain('头痛 3 天');
    expect(r).toContain('3 天前');
    expect(r).toContain('高血压病史 5 年');
    expect(r).toContain('氨氯地平');
    expect(r).toContain('青霉素过敏');
    expect(r).toContain('发热、恶心');
  });

  it('含免责声明', () => {
    const r = buildPreliminaryReport('内科', full);
    expect(r).toContain(PRELIMINARY_REPORT_DISCLAIMER);
  });

  it('空字段显示「未填写」', () => {
    const r = buildPreliminaryReport('内科', {
      chiefComplaint: '不适',
      presentIllness: '就是不舒服',
    });
    expect(r).toContain('既往史：未填写');
    expect(r).toContain('当前用药：未填写');
    expect(r).toContain('过敏史：未填写');
  });

  it('无科室时不显示科室行', () => {
    const r = buildPreliminaryReport(undefined, full);
    expect(r).not.toContain('拟就诊科室');
  });

  it('空伴随症状不显示伴随行', () => {
    const r = buildPreliminaryReport('内科', {
      chiefComplaint: 'x',
      presentIllness: 'y',
      accompanyingSymptoms: [],
    });
    expect(r).not.toContain('伴随症状');
  });

  it('validate：缺主诉/现病史返回缺失项', () => {
    const m = validatePreliminaryHistory({ chiefComplaint: '', presentIllness: '' });
    expect(m).toContain('主诉');
    expect(m).toContain('现病史');
  });

  it('validate：完整时返回空数组', () => {
    expect(validatePreliminaryHistory(full)).toEqual([]);
  });

  it('空白字符串视为缺失', () => {
    const m = validatePreliminaryHistory({ chiefComplaint: '   ', presentIllness: 'y' });
    expect(m).toContain('主诉');
  });
});
