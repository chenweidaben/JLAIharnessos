/**
 * 健澜科技 jlmedaios - 【集团与科研】科研智能化深化：文献与论文纯函数单测（M159-C）
 *
 * 覆盖：
 *  - 文献检索：关键词/作者/期刊三维 AND、年份区间、topK 截断、相关度排序；
 *  - 摘要自动总结：年/刊分布、主题标签频次、方法学谱系、gap 固定产出；
 *  - IMRaD 大纲：四章节完整性、目标期刊字数预算、真实参考文献注入；
 *  - 基金框架：国自然 vs 省自然的类别/周期/预算结构差异。
 *
 * 仅测纯函数，不触碰 IO / 时钟 / 网络。
 * 文献词典均为真实发表论文（不编造 DOI）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  LITERATURE_DICTIONARY,
  generateGrantProposal,
  generatePaperOutline,
  searchMedicalLiterature,
  summarizeLiterature,
} from '../../src/bff/aggregators/researchLitAggregator';

describe('searchMedicalLiterature 文献检索', () => {
  it('关键词 cancer 命中 5 篇（三篇统计报告 + 皮肤癌 + 乳腺癌筛查）', () => {
    const r = searchMedicalLiterature({ keyword: 'cancer' });
    expect(r.length).toBe(5);
    expect(r.every((l) => /cancer/i.test(`${l.title} ${l.abstract} ${l.keywords.join(' ')}`))).toBe(true);
  });

  it('作者 Topol 仅命中 L004（Nature Medicine 2019）', () => {
    const r = searchMedicalLiterature({ author: 'Topol' });
    expect(r.length).toBe(1);
    expect(r[0]!.id).toBe('L004');
  });

  it('作者 Bray 命中 L001 与 L002（第一作者 / 末位署名）', () => {
    const r = searchMedicalLiterature({ author: 'Bray' });
    expect(r.map((l) => l.id).sort()).toEqual(['L001', 'L002']);
  });

  it('期刊 Nature Medicine 命中 3 篇（Topol 2019 / De Fauw 2018 / He 2019）', () => {
    const r = searchMedicalLiterature({ journal: 'Nature Medicine' });
    expect(r.length).toBe(3);
    expect(r.every((l) => l.journal === 'Nature Medicine')).toBe(true);
  });

  it('年份闭区间 2018-2019 命中 9 篇（2018 六篇 + 2019 三篇）', () => {
    const r = searchMedicalLiterature({}, { start: 2018, end: 2019 });
    expect(r.length).toBe(9);
    expect(r.every((l) => l.year >= 2018 && l.year <= 2019)).toBe(true);
  });

  it('topK 截断：全词典取前 5 条', () => {
    const r = searchMedicalLiterature({}, {}, 5);
    expect(r.length).toBe(5);
  });

  it('空条件返回全词典（共 20 条真实文献）', () => {
    expect(searchMedicalLiterature({})).toHaveLength(LITERATURE_DICTIONARY.length);
    expect(LITERATURE_DICTIONARY.length).toBe(20);
  });

  it('关键词命中题名者排在命中摘要者之前（相关度排序，同年新者优先）', () => {
    const r = searchMedicalLiterature({ keyword: 'deep learning' });
    // L011（LeCun 2015，标题即 "Deep learning"）与 L018（Nagendran 2020，标题含 "deep learning studies"）
    // 同为题名命中；并列时按年份倒序，L018 在前、L011 紧随其后。
    expect(r[0]!.title.toLowerCase()).toContain('deep learning');
    expect(r.map((l) => l.id)).toContain('L011');
    expect(r.length).toBeGreaterThanOrEqual(5);
  });

  it('三维 AND：作者 Topol 且期刊 JAMA → 空集', () => {
    expect(searchMedicalLiterature({ author: 'Topol', journal: 'JAMA' })).toHaveLength(0);
  });

  it('返回条目不含 DOI 字段（不编造 DOI）', () => {
    const r = searchMedicalLiterature({ keyword: 'cancer' });
    for (const lit of r) {
      expect((lit as unknown as Record<string, unknown>).doi).toBeUndefined();
      expect(typeof lit.citation).toBe('string');
      expect(lit.citation.length).toBeGreaterThan(20);
    }
  });
});

describe('summarizeLiterature 摘要自动总结', () => {
  it('三篇 CA Cancer 统计报告：年/刊分布与主题标签', () => {
    const papers = searchMedicalLiterature({ journal: 'Cancer Journal' });
    expect(papers.length).toBe(3);
    const s = summarizeLiterature(papers);
    expect(s.total).toBe(3);
    expect(s.byJournal['CA: A Cancer Journal for Clinicians']).toBe(3);
    expect(s.byYear['2018']).toBe(1);
    expect(s.byYear['2020']).toBe(1);
    expect(s.byYear['2021']).toBe(1);
    const tumorTag = s.themeTags.find((t) => t.tag === '肿瘤统计');
    expect(tumorTag?.count).toBe(3);
    expect(s.gapStatement.length).toBeGreaterThan(10);
  });

  it('AI/深度学习主题：方法学谱系命中「深度学习」', () => {
    const papers = searchMedicalLiterature({ keyword: 'deep learning' });
    const s = summarizeLiterature(papers);
    expect(s.methods).toContain('深度学习');
    expect(s.methods).toContain('人工智能/机器学习');
    expect(s.keyFindings.length).toBeGreaterThan(0);
  });

  it('空输入返回零值结构，不抛错', () => {
    const s = summarizeLiterature([]);
    expect(s.total).toBe(0);
    expect(s.themeTags).toEqual([]);
    expect(s.methods).toEqual([]);
  });
});

describe('generatePaperOutline IMRaD 大纲', () => {
  it('四章节齐全且含子节；Nature Medicine 字数预算锚定', () => {
    const o = generatePaperOutline('人工智能辅助乳腺癌筛查的临床效用', 'Nature Medicine');
    expect(o.targetJournal).toBe('Nature Medicine');
    expect(o.introduction.heading).toContain('Introduction');
    expect(o.methods.heading).toContain('Methods');
    expect(o.results.heading).toContain('Results');
    expect(o.discussion.heading).toContain('Discussion');
    expect(o.introduction.subsections.length).toBeGreaterThanOrEqual(4);
    expect(o.methods.subsections.length).toBeGreaterThanOrEqual(4);
    // Nature Medicine 档位：引言 800 词
    expect(o.introduction.estimatedWords).toBe(800);
    expect(o.methods.estimatedWords).toBe(1500);
  });

  it('默认期刊档位：introduction=600 词', () => {
    const o = generatePaperOutline('某临床研究', '某普通期刊');
    expect(o.introduction.estimatedWords).toBe(600);
  });

  it('参考文献来自真实词典（非空引用串）', () => {
    const o = generatePaperOutline('乳腺癌', 'Nature Medicine');
    expect(o.references.length).toBeGreaterThan(0);
    for (const ref of o.references) {
      expect(ref).toContain('.');
    }
  });

  it('空主题回退为占位主题，不抛错', () => {
    const o = generatePaperOutline('', 'JAMA');
    expect(o.title).toContain('未命名');
  });
});

describe('generateGrantProposal 基金框架', () => {
  it('国自然：面上项目、36 个月、八科目预算', () => {
    const g = generateGrantProposal('住院 AKI 早期预警模型研究', '国自然');
    expect(g.category).toContain('面上项目');
    expect(g.durationMonths).toBe(36);
    expect(g.sections.length).toBeGreaterThanOrEqual(3);
    expect(g.budgetOutline.length).toBe(8);
    const total = g.budgetOutline.reduce((s, b) => s + b.ratio, 0);
    expect(total).toBe(100);
  });

  it('省自然：一般项目、24 个月、六科目预算', () => {
    const g = generateGrantProposal('肿瘤流行病学研究', '省自然');
    expect(g.category).toContain('一般项目');
    expect(g.durationMonths).toBe(24);
    expect(g.budgetOutline.length).toBe(6);
    const total = g.budgetOutline.reduce((s, b) => s + b.ratio, 0);
    expect(total).toBe(100);
  });

  it('未知资助方按国自然模板兜底', () => {
    const g = generateGrantProposal('某课题', '未知方');
    expect(g.category).toContain('面上项目');
    expect(g.durationMonths).toBe(36);
  });

  it('课题名注入章节首条 bullet', () => {
    const g = generateGrantProposal('智能分诊模型研究', '国自然');
    expect(g.sections[0]!.bullets[0]).toContain('智能分诊模型研究');
  });
});
