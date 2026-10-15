/**
 * 健澜科技 jlmedaios - AI 知识问答深化 · 纯函数单测（M154-D）「AI深化与运营预测」
 *
 * 覆盖：
 *   - answerMedicalQuestion：命中疾病/用药/检查/指南问题并附 citation；未命中返回未找到；
 *   - searchMedicalKnowledge：按相关分召回、topK 截断、空 query 安全；
 *   - generateCitation：来源规范化与默认字段补全。
 * 纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  answerMedicalQuestion,
  generateCitation,
  searchMedicalKnowledge,
  NOT_FOUND_HINT,
  QA_DISCLAIMER,
} from '../../src/bff/aggregators/medicalQaAggregator.js';

describe('M154-D 知识检索 searchMedicalKnowledge', () => {
  it('空 query 返回空数组，不抛错', () => {
    expect(searchMedicalKnowledge('', 5)).toEqual([]);
    expect(searchMedicalKnowledge('   ', 5)).toEqual([]);
    expect(searchMedicalKnowledge(null as unknown as string, 5)).toEqual([]);
  });

  it('命中疾病：“高血压”召回原发性高血压条目', () => {
    const hits = searchMedicalKnowledge('高血压', 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe('dis-hypertension');
    expect(hits[0].category).toBe('disease');
  });

  it('命中用药：“二甲双胍禁忌症”召回药品条目', () => {
    const hits = searchMedicalKnowledge('二甲双胍', 5);
    expect(hits[0].id).toBe('drug-metformin');
    expect(hits[0].category).toBe('drug');
  });

  it('topK 截断生效', () => {
    const hits = searchMedicalKnowledge('血糖', 2);
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it('无匹配关键词返回空数组', () => {
    expect(searchMedicalKnowledge('量子纠缠热力学', 5)).toEqual([]);
  });
});

describe('M154-D 问答生成 answerMedicalQuestion', () => {
  it('命中疾病子主题：“高血压有什么症状”返回对应分节并带 citation', () => {
    const r = answerMedicalQuestion('高血压有什么症状？');
    expect(r.matched).toBe(true);
    expect(r.entryId).toBe('dis-hypertension');
    expect(r.intent).toBe('症状');
    expect(r.answer).toContain('症状');
    expect(r.answer).toContain('头晕');
    expect(r.citations).toHaveLength(1);
    expect(r.citations[0].title).toContain('高血压');
    expect(r.notFoundHint).toBe('');
    expect(r.disclaimer).toBe(QA_DISCLAIMER);
  });

  it('命中用药：“阿司匹林怎么吃，剂量是多少”定位剂量分节', () => {
    const r = answerMedicalQuestion('阿司匹林的用法用量和剂量是多少？');
    expect(r.matched).toBe(true);
    expect(r.entryId).toBe('drug-aspirin');
    expect(r.intent).toBe('剂量');
    expect(r.answer).toContain('75–100 mg');
    expect(r.citations[0].sourceType).toBe('drug-label');
  });

  it('命中检查：“空腹血糖结果怎么看”定位结果解读', () => {
    const r = answerMedicalQuestion('空腹血糖的结果怎么解读？');
    expect(r.matched).toBe(true);
    expect(r.entryId).toBe('exam-fbg');
    expect(r.intent).toBe('结果解读');
    expect(r.answer).toContain('7.0 mmol/L');
  });

  it('未指定子主题时给出综述并列出可追问子主题', () => {
    const r = answerMedicalQuestion('什么是2型糖尿病？');
    expect(r.matched).toBe(true);
    expect(r.entryId).toBe('dis-t2dm');
    expect(r.answer).toContain('可进一步追问');
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it('无匹配问题：matched=false 且返回未找到提示，不带 citation', () => {
    const r = answerMedicalQuestion('量子计算的退火算法如何实现？');
    expect(r.matched).toBe(false);
    expect(r.answer).toBe('');
    expect(r.citations).toEqual([]);
    expect(r.notFoundHint).toBe(NOT_FOUND_HINT);
  });

  it('空问题安全降级', () => {
    const r = answerMedicalQuestion('');
    expect(r.matched).toBe(false);
    expect(r.notFoundHint).toBe('请输入您的医学问题。');
  });

  it('context 参数为保留扩展位，不影响结果', () => {
    const r = answerMedicalQuestion('高血压的治疗原则', { dept: '心内科' });
    expect(r.matched).toBe(true);
    expect(r.entryId).toBe('dis-hypertension');
  });
});

describe('M154-D 引用来源 generateCitation', () => {
  it('完整来源原样返回并规范化', () => {
    const c = generateCitation({
      sourceType: 'guideline',
      title: '中国高血压防治指南（2024年版）',
      publisher: '修订委员会',
      year: 2024,
    });
    expect(c.sourceType).toBe('guideline');
    expect(c.title).toBe('中国高血压防治指南（2024年版）');
    expect(c.year).toBe(2024);
  });

  it('空来源补全默认字段，不抛错', () => {
    const c = generateCitation(null);
    expect(c.title).toBe('未注明出处');
    expect(c.publisher).toBe('未注明出版方');
    expect(c.year).toBeGreaterThan(2000);
    expect(c.sourceType).toBe('textbook');
  });

  it('非法 year 被钳制为当前年份', () => {
    const c = generateCitation({ title: 'x', publisher: 'y', year: 1800 });
    expect(c.year).toBe(new Date().getFullYear());
  });
});
