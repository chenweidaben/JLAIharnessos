/**
 * 健澜AI原生医院操作系统OS — 引用编号协议与检索质量闭环单元测试（S-12）
 *
 * 覆盖：编号装配与去重、证据级别推导、引用一致性 / 完整性校验、none 级别确定性约束、
 * 级别错配、无依据拒答模板、弹窗映射与回查、协议层粗检、深拷贝隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';

import {
  buildCitations,
  buildNoEvidenceAnswer,
  CITATION_RULE_CITATION_INCOMPLETE,
  CITATION_RULE_EVIDENCE_LEVEL_MISMATCH,
  CITATION_RULE_NONE_LEVEL_CERTAINTY,
  CITATION_RULE_NONE_LEVEL_MISSING_MARKER,
  CITATION_RULE_REF_MISSING,
  CITATION_RULE_REF_UNUSED,
  CITATION_RULE_UNSUPPORTED_CLAIM,
  deriveEvidenceLevel,
  extractRefMarkers,
  findCitationByRef,
  toCitationPopupData,
  validateCitedAnswer,
  validateCitations,
  type Citation,
  type CitationHit,
  type CitedAnswer,
} from '@/knowledge-platform/citation/citationProtocol.js';

/** 构造合法命中夹具 */
function makeHit(overrides: Partial<CitationHit> = {}): CitationHit {
  return {
    chunkId: 'chunk-001',
    title: '血压控制指南',
    sectionPath: '第二章 高血压诊疗',
    provenance: {
      sourceId: 'std-bp-2026',
      sourceName: '中国高血压防治指南 2026 版',
      license: 'internal',
      fetchedAt: '2026-09-20T00:00:00.000Z',
    },
    pageRef: '12',
    effectiveDate: '2026-01-01T00:00:00.000Z',
    score: 0.86,
    quotedExcerpt: '血压控制目标一般为 140/90 mmHg 以下。',
    ...overrides,
  };
}

/** 构造合法引用条目夹具 */
function makeCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    refId: '[1]',
    chunkId: 'chunk-001',
    title: '血压控制指南',
    sectionPath: '第二章 高血压诊疗',
    pageRef: '12',
    sourceName: '中国高血压防治指南 2026 版',
    effectiveDate: '2026-01-01T00:00:00.000Z',
    quotedExcerpt: '血压控制目标一般为 140/90 mmHg 以下。',
    ...overrides,
  };
}

/** 构造合法模型输出夹具 */
function makeAnswer(overrides: Partial<CitedAnswer> = {}): CitedAnswer {
  return {
    content: '血压控制目标一般为 140/90 mmHg 以下[1]。',
    citations: [makeCitation()],
    missingInfo: [],
    evidenceLevel: 'supported',
    ...overrides,
  };
}

// ============================================================================
// 编号装配
// ============================================================================

describe('citationProtocol - buildCitations 编号装配', () => {
  it('三条命中生成 [1][2][3]，字段映射正确', () => {
    const hits = [
      makeHit({ chunkId: 'chunk-001' }),
      makeHit({ chunkId: 'chunk-002', title: '糖尿病管理指南', sectionPath: '第三章 血糖目标' }),
      makeHit({ chunkId: 'chunk-003', title: '血脂管理指南', sectionPath: '第四章 血脂目标' }),
    ];
    const citations = buildCitations(hits);
    expect(citations.map((c) => c.refId)).toEqual(['[1]', '[2]', '[3]']);
    expect(citations[0].chunkId).toBe('chunk-001');
    expect(citations[1].title).toBe('糖尿病管理指南');
    expect(citations[2].sourceName).toBe('中国高血压防治指南 2026 版');
    expect(citations[0].effectiveDate).toBe('2026-01-01T00:00:00.000Z');
    expect(citations[0].pageRef).toBe('12');
  });

  it('同 chunkId 重复命中去重，保留首条', () => {
    const hits = [
      makeHit({ chunkId: 'chunk-001', title: '首条标题' }),
      makeHit({ chunkId: 'chunk-001', title: '重复标题' }),
    ];
    const citations = buildCitations(hits);
    expect(citations).toHaveLength(1);
    expect(citations[0].title).toBe('首条标题');
  });

  it('quotedExcerpt 缺省时按命中内容截断并加省略号；超 120 字符截断口径正确', () => {
    const longContent = '规'.repeat(200) + '结尾句';
    const hit = makeHit({ quotedExcerpt: undefined, content: longContent });
    const [citation] = buildCitations([hit]);
    expect(citation.quotedExcerpt.endsWith('…')).toBe(true);
    expect(citation.quotedExcerpt.length).toBe(121);
    expect(citation.quotedExcerpt.startsWith('规'.repeat(120))).toBe(true);
  });

  it('短原文不追加省略号，effectiveDate 原样透传', () => {
    const hit = makeHit({ quotedExcerpt: undefined, content: '短片段', effectiveDate: '2026-03-01T00:00:00.000Z' });
    const [citation] = buildCitations([hit]);
    expect(citation.quotedExcerpt).toBe('短片段');
    expect(citation.effectiveDate).toBe('2026-03-01T00:00:00.000Z');
  });
});

// ============================================================================
// 证据级别推导
// ============================================================================

describe('citationProtocol - deriveEvidenceLevel 证据级别推导', () => {
  it('无命中 → none；有命中且 missingInfo 非空 → partial；有命中且无缺口 → supported', () => {
    expect(deriveEvidenceLevel([], [])).toBe('none');
    expect(deriveEvidenceLevel([makeHit()], ['用药剂量待补充'])).toBe('partial');
    expect(deriveEvidenceLevel([makeHit()], [])).toBe('supported');
  });
});

// ============================================================================
// 引用一致性与完整性校验
// ============================================================================

describe('citationProtocol - validateCitedAnswer 引用一致性校验', () => {
  it('正文 [1] 与 citations 一一对应 → PASS，sanitizedAnswer 回填深拷贝', () => {
    const answer = makeAnswer({
      content: '血压控制目标一般为 140/90 mmHg 以下[1]。',
      citations: [makeCitation()],
    });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.level).toBe('PASS');
    expect(verdict.issues).toEqual([]);
    expect(verdict.sanitizedAnswer?.content).toBe(answer.content);
  });

  it('正文引用缺失编号 → BLOCK（ref-missing），issue 携带 refId', () => {
    const answer = makeAnswer({ content: '血压建议参见[1]与[3]。', citations: [makeCitation()] });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.level).toBe('BLOCK');
    const missing = verdict.issues.find((i) => i.rule === CITATION_RULE_REF_MISSING);
    expect(missing?.severity).toBe('block');
    expect(missing?.refId).toBe('[3]');
  });

  it('非法编号格式（[0]、[abc]）→ BLOCK（ref-missing）', () => {
    const zero = makeAnswer({ content: '参见[0]。', citations: [] });
    expect(validateCitedAnswer(zero).issues.some((i) => i.rule === CITATION_RULE_REF_MISSING)).toBe(true);
    const text = makeAnswer({ content: '参见[abc]。', citations: [] });
    expect(validateCitedAnswer(text).level).toBe('BLOCK');
  });

  it('citation 未被正文使用 → CAUTION（ref-unused）', () => {
    const answer = makeAnswer({
      content: '血压控制目标一般为 140/90 mmHg 以下[1]。',
      citations: [makeCitation(), makeCitation({ refId: '[2]', chunkId: 'chunk-002' })],
    });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.level).toBe('CAUTION');
    const unused = verdict.issues.find((i) => i.rule === CITATION_RULE_REF_UNUSED);
    expect(unused?.severity).toBe('caution');
    expect(unused?.refId).toBe('[2]');
  });

  it('缺 sourceName / quotedExcerpt 等必填字段 → BLOCK（citation-incomplete）', () => {
    const answer = makeAnswer({
      citations: [makeCitation({ sourceName: '', quotedExcerpt: '' })],
    });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.level).toBe('BLOCK');
    const incomplete = verdict.issues.find((i) => i.rule === CITATION_RULE_CITATION_INCOMPLETE);
    expect(incomplete?.message).toContain('sourceName');
    expect(incomplete?.message).toContain('quotedExcerpt');
  });

  it('effectiveDate 格式非法 → BLOCK（citation-incomplete）', () => {
    const answer = makeAnswer({ citations: [makeCitation({ effectiveDate: 'not-a-date' })] });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_CITATION_INCOMPLETE && i.message.includes('effectiveDate'))).toBe(true);
  });

  it('模块级别名 validateCitations 与 validateCitedAnswer 结果一致', () => {
    const answer = makeAnswer();
    expect(validateCitations(answer).level).toBe(validateCitedAnswer(answer).level);
  });
});

// ============================================================================
// none 级别确定性约束
// ============================================================================

describe('citationProtocol - none 级别约束', () => {
  it('none 正文含「（待核实）」且无确定性措辞 → 不产出 none 级别阻断问题', () => {
    const answer = makeAnswer({
      content: '（待核实）该问题暂无权威依据，需进一步确认。',
      citations: [],
      evidenceLevel: 'none',
    });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_NONE_LEVEL_MISSING_MARKER)).toBe(false);
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_NONE_LEVEL_CERTAINTY)).toBe(false);
  });

  it('none 正文缺「（待核实）」标记 → BLOCK（none-level-missing-marker）', () => {
    const answer = makeAnswer({ content: '该问题暂无法确认。', citations: [], evidenceLevel: 'none' });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_NONE_LEVEL_MISSING_MARKER)).toBe(true);
  });

  it('none 命中确定性措辞（确诊 / 肯定 / 一定 / 建议立即）→ BLOCK（none-level-certainty），excerpt 为命中片段', () => {
    for (const phrase of ['确诊', '肯定', '一定', '建议立即']) {
      const answer = makeAnswer({
        content: `（待核实）该病${phrase}为常见问题。`,
        citations: [],
        evidenceLevel: 'none',
      });
      const verdict = validateCitedAnswer(answer);
      const issue = verdict.issues.find((i) => i.rule === CITATION_RULE_NONE_LEVEL_CERTAINTY);
      expect(issue?.severity).toBe('block');
      expect(issue?.excerpt).toBe(phrase);
    }
  });
});

// ============================================================================
// 证据级别错配
// ============================================================================

describe('citationProtocol - evidence-level-mismatch 级别错配', () => {
  it('supported 无引用 → CAUTION', () => {
    const answer = makeAnswer({ content: '该结论有依据。', citations: [], evidenceLevel: 'supported' });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_EVIDENCE_LEVEL_MISMATCH && i.message.includes('supported'))).toBe(true);
    expect(verdict.level).toBe('CAUTION');
  });

  it('none 携带非空 citations → CAUTION', () => {
    const answer = makeAnswer({ content: '（待核实）暂无依据[1]。', evidenceLevel: 'none' });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_EVIDENCE_LEVEL_MISMATCH && i.message.includes('none'))).toBe(true);
  });

  it('partial 无 missingInfo → CAUTION', () => {
    const answer = makeAnswer({
      content: '综合判断如下[1]。',
      citations: [makeCitation()],
      missingInfo: [],
      evidenceLevel: 'partial',
    });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_EVIDENCE_LEVEL_MISMATCH && i.message.includes('partial'))).toBe(true);
  });
});

// ============================================================================
// 协议层粗检
// ============================================================================

describe('citationProtocol - unsupported-claim 协议层粗检', () => {
  it('supported 正文无 [n] 标记 → CAUTION（unsupported-claim）', () => {
    const answer = makeAnswer({ content: '综合指南给出如下建议。', citations: [] });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_UNSUPPORTED_CLAIM)).toBe(true);
  });

  it('partial 正文无 [n] 标记 → CAUTION（unsupported-claim）', () => {
    const answer = makeAnswer({
      content: '部分结论如下。',
      citations: [],
      missingInfo: ['剂量待补充'],
      evidenceLevel: 'partial',
    });
    expect(validateCitedAnswer(answer).issues.some((i) => i.rule === CITATION_RULE_UNSUPPORTED_CLAIM)).toBe(true);
  });
});

// ============================================================================
// 无依据拒答模板
// ============================================================================

describe('citationProtocol - buildNoEvidenceAnswer 无命中拒答模板', () => {
  it('产出 none 级别、空引用；missingInfo 空数组时兜底缺口文案', () => {
    const answer = buildNoEvidenceAnswer('患者是否需要立即服药？', []);
    expect(answer.evidenceLevel).toBe('none');
    expect(answer.citations).toEqual([]);
    expect(answer.missingInfo).toEqual(['检索未命中可引用知识条目']);
  });

  it('正文含「（待核实）」且不含确定性措辞；query 原文进入模板；自定义 missingInfo 原样回读', () => {
    const answer = buildNoEvidenceAnswer('是否需要调整用药？', ['当前检验结果缺失']);
    expect(answer.content.includes('（待核实）')).toBe(true);
    expect(answer.content.includes('是否需要调整用药？')).toBe(true);
    expect(answer.missingInfo).toEqual(['当前检验结果缺失']);
    const verdict = validateCitedAnswer(answer);
    expect(verdict.issues.some((i) => i.rule === CITATION_RULE_NONE_LEVEL_CERTAINTY)).toBe(false);
    expect(verdict.level).toBe('PASS');
  });
});

// ============================================================================
// 弹窗映射与回查
// ============================================================================

describe('citationProtocol - 弹窗映射与引用回查', () => {
  it('toCitationPopupData 字段一一对应，密级可选透传', () => {
    const popup = toCitationPopupData(makeCitation(), 'internal');
    expect(popup.refId).toBe('[1]');
    expect(popup.chunkId).toBe('chunk-001');
    expect(popup.title).toBe('血压控制指南');
    expect(popup.sectionPath).toBe('第二章 高血压诊疗');
    expect(popup.pageRef).toBe('12');
    expect(popup.sourceName).toBe('中国高血压防治指南 2026 版');
    expect(popup.effectiveDate).toBe('2026-01-01T00:00:00.000Z');
    expect(popup.securityLevel).toBe('internal');
    expect(popup.quotedExcerpt).toBe('血压控制目标一般为 140/90 mmHg 以下。');

    const plain = toCitationPopupData(makeCitation());
    expect(plain.securityLevel).toBeUndefined();
  });

  it('extractRefMarkers 按出现顺序去重提取合法编号', () => {
    expect(extractRefMarkers('结论见[2]，补充见[1]，复查见[2]。')).toEqual(['[2]', '[1]']);
    expect(extractRefMarkers('无编号正文')).toEqual([]);
  });

  it('findCitationByRef 命中与未命中分支', () => {
    const answer = makeAnswer();
    expect(findCitationByRef(answer, '[1]')?.chunkId).toBe('chunk-001');
    expect(findCitationByRef(answer, '[2]')).toBeUndefined();
  });
});

// ============================================================================
// 深拷贝隔离
// ============================================================================

describe('citationProtocol - 深拷贝隔离', () => {
  it('PASS 时 sanitizedAnswer 为深拷贝，外部修改不影响入参与结论', () => {
    const answer = makeAnswer();
    const verdict = validateCitedAnswer(answer);
    expect(verdict.sanitizedAnswer).toBeDefined();
    verdict.sanitizedAnswer!.content = '外部篡改正文';
    verdict.sanitizedAnswer!.citations.push(makeCitation({ refId: '[9]' }));
    expect(answer.content).toBe('血压控制目标一般为 140/90 mmHg 以下[1]。');
    expect(answer.citations).toHaveLength(1);

    // 重新校验原答案仍为 PASS
    expect(validateCitedAnswer(answer).level).toBe('PASS');
  });

  it('BLOCK 时不回填 sanitizedAnswer，入参不被校验器改写', () => {
    const answer = makeAnswer({ content: '缺失编号[9]。', citations: [] });
    const verdict = validateCitedAnswer(answer);
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.sanitizedAnswer).toBeUndefined();
    expect(answer.content).toBe('缺失编号[9]。');
  });
});
