/**
 * 健澜AI原生医院操作系统OS — A27 检索结果纯适配器单元测试
 *
 * 覆盖：RetrievalHit → CitationHit 字段无损映射、标签前置过滤、相关度阈值上下边界剔除、
 * 剔除为空时输出拒答结构、守卫快照透传；不调用 Embedding 供应商，不修改 hybrid 模块。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';

import { adaptRetrievalHits } from '@/knowledge-platform/citation/retrievalAdapter.js';
import type { RetrievalHit } from '@/knowledge-platform/types.js';

function makeRaw(overrides: Partial<RetrievalHit> = {}): RetrievalHit {
  return {
    id: 'chunk-001',
    kind: 'chunk',
    content: '血压控制目标一般为 140/90 mmHg 以下。',
    title: '血压控制指南',
    score: 0.86,
    provenance: {
      sourceId: 'std-bp-2026',
      sourceName: '中国高血压防治指南 2026 版',
      license: 'internal',
      fetchedAt: '2026-09-20T00:00:00.000Z',
    },
    sectionPath: '第二章 高血压诊疗',
    graphPath: 'guide-001 > bp-section-02',
    metadata: {
      pageRef: '12',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      tags: ['guideline', 'bp'],
      securityLevel: 'internal',
      conflictGroup: 'cg-bp',
    },
    ...overrides,
  };
}

describe('adaptRetrievalHits - 字段无损映射', () => {
  it('单条命中映射为 CitationHit，编号装配与级别推导透传守卫结果', () => {
    const result = adaptRetrievalHits([makeRaw()], { question: '血压控制目标是多少？' });
    expect(result.rawCount).toBe(1);
    expect(result.retainedCount).toBe(1);
    expect(result.droppedByTag).toBe(0);
    expect(result.droppedBelowThreshold).toBe(0);

    const mapped = result.mappedHits[0];
    expect(mapped.chunkId).toBe('chunk-001');
    expect(mapped.title).toBe('血压控制指南');
    expect(mapped.sectionPath).toBe('第二章 高血压诊疗');
    expect(mapped.provenance.sourceId).toBe('std-bp-2026');
    expect(mapped.provenance.sourceName).toBe('中国高血压防治指南 2026 版');
    expect(mapped.score).toBe(0.86);
    expect(mapped.quotedExcerpt).toBe('血压控制目标一般为 140/90 mmHg 以下。');
    expect(mapped.pageRef).toBe('12');
    expect(mapped.effectiveDate).toBe('2026-01-01T00:00:00.000Z');
    expect(mapped.graphPath).toBe('guide-001 > bp-section-02');
    expect(mapped.securityLevel).toBe('internal');
    expect(mapped.conflictGroup).toBe('cg-bp');

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].sourceName).toBe('中国高血压防治指南 2026 版');
    expect(result.level).toBe('supported');
    expect(result.allowed).toBe(true);
    expect(result.auditSnapshot.hitCount).toBe(1);
  });

  it('provenance 与 metadata 缺失时映射不抛错，可选字段留空', () => {
    const bare = makeRaw({ sectionPath: undefined, graphPath: undefined, metadata: undefined });
    const result = adaptRetrievalHits([bare]);
    expect(result.mappedHits[0].sectionPath).toBe('');
    expect(result.mappedHits[0].graphPath).toBeUndefined();
    expect(result.mappedHits[0].pageRef).toBeUndefined();
  });
});

describe('adaptRetrievalHits - 相关度阈值上下边界', () => {
  it('阈值边界含等号：0.85 保留，0.84 剔除并计数', () => {
    const result = adaptRetrievalHits(
      [makeRaw({ id: 'chunk-001', score: 0.85 }), makeRaw({ id: 'chunk-002', score: 0.84 })],
      { minScore: 0.85 },
    );
    expect(result.retainedCount).toBe(1);
    expect(result.droppedBelowThreshold).toBe(1);
    expect(result.mappedHits.map((hit) => hit.chunkId)).toEqual(['chunk-001']);
  });

  it('剔除后命中为空，守卫输出无依据拒答结构并阻断放行', () => {
    const result = adaptRetrievalHits(
      [makeRaw({ id: 'chunk-001', score: 0.6 }), makeRaw({ id: 'chunk-002', score: 0.55 })],
      { minScore: 0.9, question: '待核实问题' },
    );
    expect(result.retainedCount).toBe(0);
    expect(result.droppedBelowThreshold).toBe(2);
    expect(result.allowed).toBe(false);
    expect(result.level).toBe('none');
    expect(result.reasonCode).toBe('NONE_EVIDENCE');
    expect(result.answer.evidenceLevel).toBe('none');
    expect(result.answer.citations).toEqual([]);
    expect(result.answer.content).toContain('待核实');
  });
});

describe('adaptRetrievalHits - 标签前置过滤', () => {
  it('命中标签与要求标签相交时保留；不相交剔除并计数', () => {
    const matched = adaptRetrievalHits([makeRaw()], { requiredTags: ['bp'] });
    expect(matched.retainedCount).toBe(1);
    expect(matched.droppedByTag).toBe(0);

    const dropped = adaptRetrievalHits([makeRaw()], { requiredTags: ['medication'] });
    expect(dropped.retainedCount).toBe(0);
    expect(dropped.droppedByTag).toBe(1);
  });

  it('metadata.tags 缺失时标签过滤视为不匹配并剔除', () => {
    const noTags = makeRaw({ metadata: { pageRef: '12' } });
    const result = adaptRetrievalHits([noTags], { requiredTags: ['bp'] });
    expect(result.droppedByTag).toBe(1);
    expect(result.retainedCount).toBe(0);
  });
});
