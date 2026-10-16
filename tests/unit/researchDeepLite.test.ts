/**
 * 健澜科技 jlmedaios - M166-C【绩效与人才】AI 辅助科研深化纯函数单测
 *
 * 覆盖：
 *  - buildLiteratureReview：真实词典检索 / 年份区间 / topK 截断 /
 *    摘要要点 / 趋势（逐年+热点+演变）/ 方法对比；
 *  - designExperiment：五种方法学模板装配与非法方法拦截；
 *  - generateStatisticalPlan：按设计映射检验、alpha/power/报告标准；
 *  - draftResearchPaper：结果段只复述实测数字、缺失落占位（不预造）。
 *
 * 红线：内置文献均为真实发表论文词典（LITERATURE_DICTIONARY），
 *       本测试不新增任何假文献。仅测纯函数，不触碰 IO / 时钟 / WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildLiteratureReview,
  designExperiment,
  draftResearchPaper,
  generateStatisticalPlan,
} from '../../src/bff/aggregators/researchDeepAggregator';

describe('buildLiteratureReview 文献综述（真实词典）', () => {
  it('主题「深度学习」命中多篇真实文献，按年份降序', () => {
    const r = buildLiteratureReview('深度学习');
    expect(r.totalMatched).toBeGreaterThan(3);
    expect(r.papers.length).toBeGreaterThan(0);
    for (let i = 1; i < r.papers.length; i++) {
      expect(r.papers[i]!.year).toBeLessThanOrEqual(r.papers[i - 1]!.year);
    }
    // 引用串非空（真实 Vancouver 引用，非编造）
    for (const p of r.papers) expect(p.citation.length).toBeGreaterThan(5);
  });

  it('摘要总结：每篇自动提取要点且非空', () => {
    const r = buildLiteratureReview('人工智能', { start: 2017, end: 2020 });
    expect(r.keyPoints.length).toBeGreaterThan(0);
    for (const kp of r.keyPoints) expect(kp.length).toBeGreaterThan(3);
  });

  it('年份区间过滤：start=2019 后无早于 2019 的文献', () => {
    const r = buildLiteratureReview('人工智能', { start: 2019 });
    for (const p of r.papers) expect(p.year).toBeGreaterThanOrEqual(2019);
  });

  it('topK 截断：topK=2 时最多返回 2 篇', () => {
    const r = buildLiteratureReview('深度学习', undefined, 2);
    expect(r.papers.length).toBeLessThanOrEqual(2);
    expect(r.totalMatched).toBeGreaterThan(r.papers.length);
  });

  it('趋势分析：逐年分布升序、热点关键词非空、三段演变齐全', () => {
    const r = buildLiteratureReview('深度学习');
    for (let i = 1; i < r.trend.byYear.length; i++) {
      expect(r.trend.byYear[i]!.year).toBeGreaterThan(r.trend.byYear[i - 1]!.year);
    }
    expect(r.trend.hotKeywords.length).toBeGreaterThan(0);
    expect(r.trend.evolution.length).toBe(3);
  });

  it('方法对比：深度学习主题必含 AI/深度学习方法组', () => {
    const r = buildLiteratureReview('深度学习');
    const ai = r.methodComparison.find((m) => m.method === 'ai_deep_learning');
    expect(ai).toBeDefined();
    expect(ai!.count).toBeGreaterThan(0);
    expect(ai!.strengths.length).toBeGreaterThan(0);
    expect(ai!.weaknesses.length).toBeGreaterThan(0);
  });

  it('真实性声明随结果返回', () => {
    const r = buildLiteratureReview('乳腺癌');
    expect(r.sourceDisclaimer).toContain('真实');
  });

  it('空主题 / 非法年份 / 逆区间抛错', () => {
    expect(() => buildLiteratureReview('')).toThrow();
    expect(() => buildLiteratureReview('深度学习', { start: 1800 })).toThrow();
    expect(() => buildLiteratureReview('深度学习', { start: 2020, end: 2018 })).toThrow();
    expect(() => buildLiteratureReview('深度学习', undefined, 0)).toThrow();
  });
});

describe('designExperiment 实验设计', () => {
  it('诊断准确性研究：盲法金标准 + STARD 报告标准', () => {
    const d = designExperiment('急性肾损伤早期预警模型', 'diagnostic-accuracy');
    expect(d.method).toBe('diagnostic-accuracy');
    expect(d.reportingStandard).toBe('STARD 2015');
    expect(d.arms.length).toBe(2);
    expect(d.primaryEndpoint).toContain('AUC');
    expect(d.inclusion.length).toBeGreaterThan(0);
    expect(d.ethics.length).toBeGreaterThan(0);
  });

  it('RCT：ITT 假设 + CONSORT', () => {
    const d = designExperiment('新药 vs 常规降压', 'randomized-trial');
    expect(d.reportingStandard).toBe('CONSORT 2010');
    expect(d.arms.map((a) => a.name)).toEqual(['试验组', '对照组']);
  });

  it('回顾性队列：PSM 提示', () => {
    const d = designExperiment('EHR 深度学习预警', 'retrospective-cohort');
    expect(d.sampleSizeHint).toContain('EHR');
  });

  it('非法方法 / 空问题抛错', () => {
    expect(() => designExperiment('x', 'magic')).toThrow();
    expect(() => designExperiment('', 'cohort')).toThrow();
  });
});

describe('generateStatisticalPlan 统计方案', () => {
  it('诊断准确性：含 ROC/AUC 检验、alpha=0.05', () => {
    const d = designExperiment('皮肤癌分类模型', 'diagnostic-accuracy');
    const s = generateStatisticalPlan(d);
    expect(s.alpha).toBe(0.05);
    expect(s.power).toBe(0.8);
    expect(s.tests.some((t) => t.test.includes('AUC'))).toBe(true);
    expect(s.reportingStandard).toBe('STARD 2015');
  });

  it('RCT：主分析为 ITT', () => {
    const d = designExperiment('干预 x', 'randomized-trial');
    const s = generateStatisticalPlan(d);
    expect(s.primaryAnalysis).toContain('ITT');
  });

  it('队列：含 Cox 回归检验', () => {
    const d = designExperiment('暴露 x', 'prospective-cohort');
    const s = generateStatisticalPlan(d);
    expect(s.tests.some((t) => t.test.includes('Cox'))).toBe(true);
  });

  it('空设计抛错', () => {
    expect(() => generateStatisticalPlan(null as unknown as never)).toThrow();
  });
});

describe('draftResearchPaper 论文初稿（不预造数字）', () => {
  it('传入实测结果：结果段原样复述', () => {
    const p = draftResearchPaper('急性肾损伤 AI 预警', {
      sampleSize: 15620,
      keyFindings: ['AUC 较传统评分提升 0.08'],
      effectSize: 'HR=1.32, 95%CI 1.10—1.58',
      pValue: 'P<0.001',
      references: ['Neu 2019. AKI deep learning.'],
    });
    expect(p.title).toContain('急性肾损伤 AI 预警');
    expect(p.structuredAbstract.results).toContain('n=15620');
    expect(p.structuredAbstract.results).toContain('HR=1.32');
    expect(p.resultsNarrative.some((x) => x.includes('P<0.001'))).toBe(true);
    expect(p.references).toEqual(['Neu 2019. AKI deep learning.']);
  });

  it('缺省结果：落「待填入」占位，绝不出现编造数字', () => {
    const p = draftResearchPaper('主题 x');
    expect(p.structuredAbstract.results).toContain('待填入');
    expect(p.resultsNarrative.some((x) => x.includes('待填入'))).toBe(true);
    expect(p.disclaimer).toContain('未接入任何大模型杜撰');
  });

  it('空主题抛错', () => {
    expect(() => draftResearchPaper('')).toThrow();
  });
});
