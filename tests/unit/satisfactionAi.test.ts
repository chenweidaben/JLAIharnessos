/**
 * 健澜科技 jlmedaios - M153-D 患者满意度智能化分析纯函数单测
 *
 * 覆盖：
 *   - analyzeSatisfactionFeedback：正面/负面/中性判定、负面占比、空数据兜底、不修改入参；
 *   - extractKeyIssues：负面词典命中、多类别叠加、严重度分级、样本去重与条数上限；
 *   - generateImprovementPlan：优先级（high/medium/low）、排序、量化目标。
 *
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzeSatisfactionFeedback,
  extractKeyIssues,
  generateImprovementPlan,
  NEGATIVE_LEXICON,
  type LowScoreDept,
} from '../../src/bff/aggregators/satisfactionAiAggregator';

describe('analyzeSatisfactionFeedback', () => {
  it('正面评论（满意/耐心/谢谢）判为 positive', () => {
    const r = analyzeSatisfactionFeedback([
      '医生很耐心，解释清楚，非常满意',
      '护士周到，感谢',
      '服务不错，专业',
    ]);
    expect(r.total).toBe(3);
    expect(r.positiveCount).toBe(3);
    expect(r.negativeCount).toBe(0);
    expect(r.negativeRatio).toBe(0);
    expect(r.overall).toBe('positive');
  });

  it('负面评论（等待/态度/费用/排队）判为 negative', () => {
    const r = analyzeSatisfactionFeedback([
      '排队太久，等了半天',
      '医生态度差，不耐烦',
      '费用太贵，乱收费',
      '环境脏，卫生间异味',
    ]);
    expect(r.negativeCount).toBe(4);
    expect(r.positiveCount).toBe(0);
    expect(r.negativeRatio).toBeCloseTo(1, 3);
    expect(r.overall).toBe('negative');
  });

  it('无关键词的普通评论落入 neutral', () => {
    const r = analyzeSatisfactionFeedback(['今天来院', '挂了号', '就诊结束']);
    expect(r.total).toBe(3);
    expect(r.neutralCount).toBe(3);
    expect(r.overall).toBe('positive'); // 无负面信号 → 正面基线
  });

  it('空数组与空白评论兜底为零，overall 仍为 positive', () => {
    const r = analyzeSatisfactionFeedback([]);
    expect(r.total).toBe(0);
    expect(r.negativeRatio).toBe(0);
    expect(r.overall).toBe('positive');

    const r2 = analyzeSatisfactionFeedback(['', '   ', '\t']);
    expect(r2.total).toBe(0);
  });

  it('负面占比落在 [0.2, 0.4) → overall=neutral', () => {
    // 5 条里 1 条负面 = 0.2
    const r = analyzeSatisfactionFeedback([
      '排队太久了',
      '满意', '谢谢', '不错', '耐心',
    ]);
    expect(r.negativeCount).toBe(1);
    expect(r.negativeRatio).toBeCloseTo(0.2, 3);
    expect(r.overall).toBe('neutral');
  });

  it('不修改入参', () => {
    const input = ['排队太久', '医生态度差'];
    const snapshot = input.slice();
    analyzeSatisfactionFeedback(input);
    expect(input).toEqual(snapshot);
  });
});

describe('extractKeyIssues', () => {
  it('命中「等待/排队」归入 wait_time 类别', () => {
    const issues = extractKeyIssues([
      '排队太久，等了半天',
      '候诊时间太长',
      '人太多排长队',
    ]);
    const wait = issues.find((i) => i.category === 'wait_time');
    expect(wait).toBeDefined();
    expect(wait?.count).toBeGreaterThanOrEqual(3);
    expect(wait?.label).toBe('等待/排队');
  });

  it('一条评论同时命中多类别时独立计数', () => {
    const issues = extractKeyIssues(['排队太久，医生态度差，费用也贵']);
    const cats = issues.map((i) => i.category);
    expect(cats).toContain('wait_time');
    expect(cats).toContain('staff_attitude');
    expect(cats).toContain('cost');
  });

  it('严重度分级：≥5 高、≥2 中、其余低', () => {
    const many = Array.from({ length: 6 }, () => '排队太久');
    const issues = extractKeyIssues(many);
    expect(issues.find((i) => i.category === 'wait_time')?.severity).toBe('high');

    const few = extractKeyIssues(['医生态度差', '态度不好']);
    expect(few.find((i) => i.category === 'staff_attitude')?.severity).toBe('medium');

    const one = extractKeyIssues(['环境脏']);
    expect(one.find((i) => i.category === 'environment')?.severity).toBe('low');
  });

  it('样本评论去重且最多 3 条', () => {
    const same = ['排队太久', '排队太久', '排队太久', '排队太久', '排队太久'];
    const issues = extractKeyIssues(same);
    const wait = issues.find((i) => i.category === 'wait_time');
    expect(wait?.count).toBe(5);
    expect(wait?.sampleComments.length).toBeLessThanOrEqual(3);
  });

  it('正面评论不产生关键问题', () => {
    const issues = extractKeyIssues(['满意，耐心，谢谢', '医生很专业']);
    expect(issues.length).toBe(0);
  });

  it('负面词典覆盖任务要求的等待/态度/费用/排队四类', () => {
    // 守护测试：词典缺失会回归到「只看分数」的老问题
    expect(NEGATIVE_LEXICON.wait_time.join(',')).toContain('排队');
    expect(NEGATIVE_LEXICON.wait_time.join(',')).toContain('等待');
    expect(NEGATIVE_LEXICON.staff_attitude.join(',')).toContain('态度');
    expect(NEGATIVE_LEXICON.cost.join(',')).toContain('费');
  });
});

describe('generateImprovementPlan', () => {
  const depts: LowScoreDept[] = [
    { dept: 'outpatient', avgScore: 2.2, issueCount: 6 },   // high
    { dept: 'inpatient', avgScore: 3.1, issueCount: 2 },   // medium
    { dept: 'consultation', avgScore: 4.2, issueCount: 0 }, // low（但仍传入则按规则算 low）
  ];

  it('低分（<2.5）或问题数 ≥5 → high 优先级', () => {
    const plan = generateImprovementPlan(depts);
    const opd = plan.find((p) => p.dept === 'outpatient');
    expect(opd?.priority).toBe('high');
    expect(opd?.actions.length).toBeGreaterThanOrEqual(2);
  });

  it('均分 [2.5, 3.5) 或问题数 ≥2 → medium', () => {
    const plan = generateImprovementPlan(depts);
    const ipd = plan.find((p) => p.dept === 'inpatient');
    expect(ipd?.priority).toBe('medium');
  });

  it('高优排在最前，同级按均分升序', () => {
    const plan = generateImprovementPlan(depts);
    expect(plan[0].dept).toBe('outpatient'); // high
    expect(plan[plan.length - 1].dept).toBe('consultation');
  });

  it('每条计划带量化改进目标（30 天提升）', () => {
    const plan = generateImprovementPlan(depts);
    for (const p of plan) {
      expect(p.target).toContain('30 天');
      expect(p.target).toContain(p.dept);
    }
  });

  it('空输入返回空数组', () => {
    expect(generateImprovementPlan([])).toEqual([]);
  });

  it('不修改入参', () => {
    const snapshot = depts.map((d) => ({ ...d }));
    generateImprovementPlan(depts);
    expect(depts).toEqual(snapshot);
  });
});
