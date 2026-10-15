/**
 * 健澜科技 jlmedaios - 病历 AI 语音录入与智能补全（M152-B）纯函数单测
 *
 * 覆盖：语音转写 → 结构化病历（voiceToMedicalRecord）、医疗术语识别（recognizeMedicalTerms）、
 *      输入智能补全（smartCompleteMedicalRecord：常用主诉/诊断/用药）、病历模板自动填充（fillMedicalTemplate）。
 * 全部为纯函数，使用 mock 数据，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, expect, it } from 'bun:test';

import {
  fillMedicalTemplate,
  recognizeMedicalTerms,
  smartCompleteMedicalRecord,
  voiceToMedicalRecord,
} from '../../src/bff/aggregators/voiceRecordAggregator';

describe('M152-B 语音转写 → 结构化病历', () => {
  it('口述含心血管术语：识别高血压/冠心病/阿司匹林并结构化', () => {
    const rec = voiceToMedicalRecord(
      '患者胸痛3天，既往高血压病史，考虑冠心病，予阿司匹林及硝酸甘油治疗',
      'admission',
    );
    expect(rec.recordType).toBe('admission');
    expect(rec.recognizedTerms).toContain('原发性高血压');
    expect(rec.recognizedTerms).toContain('冠状动脉粥样硬化性心脏病');
    expect(rec.diagnosis).toContain('原发性高血压');
    expect(rec.treatment).toContain('阿司匹林肠溶片');
    expect(rec.treatment).toContain('硝酸甘油片');
    expect(rec.chiefComplaint).toContain('胸痛');
    expect(rec.confidence).toBeGreaterThan(0);
  });

  it('支持结构化语音载荷 { transcript } 与冠脉造影术语', () => {
    const rec = voiceToMedicalRecord({ transcript: '拟行冠脉造影，患者糖尿病史', durationSec: 12 }, 'progress');
    expect(rec.rawTranscript).toContain('冠脉造影');
    expect(rec.recognizedTerms).toContain('冠状动脉造影术');
    expect(rec.diagnosis).toContain('2型糖尿病');
  });

  it('Blob/无文本输入：不臆造内容，置信度为 0', () => {
    const rec = voiceToMedicalRecord(new Blob(['binary-audio'], { type: 'audio/wav' }), 'progress');
    expect(rec.rawTranscript).toBe('');
    expect(rec.recognizedTerms).toEqual([]);
    expect(rec.confidence).toBe(0);
  });

  it('recognizeMedicalTerms 命中糖尿病/二甲双胍标准术语', () => {
    expect(recognizeMedicalTerms('糖尿病患者口服二甲双胍')).toContain('2型糖尿病');
    expect(recognizeMedicalTerms('糖尿病患者口服二甲双胍')).toContain('盐酸二甲双胍缓释片');
  });
});

describe('M152-B 输入智能补全（常用主诉/诊断/用药）', () => {
  it('心血管上下文：返回冠心病诊断、阿司匹林用药与主诉模板，按分数降序', () => {
    const list = smartCompleteMedicalRecord('患者反复胸闷胸痛', { dept: '心血管内科', recordType: 'progress' });
    expect(list.some((c) => c.kind === 'diagnosis' && c.text.includes('冠状动脉粥样硬化性心脏病'))).toBe(true);
    expect(list.some((c) => c.kind === 'medication' && c.text.includes('阿司匹林'))).toBe(true);
    expect(list.some((c) => c.kind === 'chief_complaint')).toBe(true);
    expect(list.some((c) => c.kind === 'template')).toBe(true);
    const scores = list.map((c) => c.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('内分泌上下文：提示2型糖尿病与二甲双胍', () => {
    const list = smartCompleteMedicalRecord('血糖升高', { dept: '内分泌科' });
    expect(list.some((c) => c.kind === 'diagnosis' && c.text.includes('2型糖尿病'))).toBe(true);
    expect(list.some((c) => c.kind === 'medication' && c.text.includes('二甲双胍'))).toBe(true);
  });

  it('已输入内容不重复提示（去重）', () => {
    const list = smartCompleteMedicalRecord('冠状动脉粥样硬化性心脏病', { dept: '心血管内科' });
    expect(list.find((c) => c.text.includes('冠状动脉粥样硬化性心脏病'))).toBeUndefined();
  });

  it('空输入返回空数组', () => {
    expect(smartCompleteMedicalRecord('', {})).toEqual([]);
  });
});

describe('M152-B 病历模板自动填充', () => {
  it('入院记录模板：含标题、主诉与诊断行', () => {
    const rec = voiceToMedicalRecord('胸痛，高血压', 'admission');
    const tpl = fillMedicalTemplate('admission', rec);
    expect(tpl).toContain('【入院记录】');
    expect(tpl).toContain('主诉：');
    expect(tpl).toContain('诊断：');
    expect(tpl).toContain('原发性高血压');
    expect(tpl).toContain('需经主治医师审核确认');
  });

  it('出院小结模板：按类型选用对应骨架', () => {
    const rec = voiceToMedicalRecord('糖尿病血糖控制可', 'discharge');
    const tpl = fillMedicalTemplate('discharge', rec);
    expect(tpl).toContain('【出院小结】');
    expect(tpl).toContain('出院医嘱');
  });
});
