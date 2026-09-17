/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 向量存储层（LocalVectorStore / EmbeddingService / 余弦相似度）
 */

import { describe, it, expect } from 'bun:test';
import { LocalVectorStore, cosineSimilarity } from '@knowledge/vector/LocalVectorStore';
import { MockEmbeddingService } from '@knowledge/vector/EmbeddingService';
import type { VectorRecord, VectorMetadata } from '@knowledge/types';

/** 构造测试用元数据 */
function makeMeta(overrides: Partial<VectorMetadata> = {}): VectorMetadata {
  return {
    knowledgeId: 'KB-TEST-001',
    chunkId: 'KB-TEST-001#chunk-0',
    docTitle: '测试文档',
    sectionPath: '测试文档 > 章节',
    level: 'L2',
    category: '临床指南',
    sourceType: 'official_guideline',
    department: '心内科',
    publishDate: '2024-01-01',
    version: 'v1.0.0',
    authorityScore: 5,
    tags: ['高血压'],
    isActive: true,
    ...overrides,
  };
}

describe('cosineSimilarity', () => {
  it('相同向量相似度为 1', () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });
  it('正交向量相似度为 0', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 5);
  });
  it('相反向量相似度为 -1', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });
  it('零向量返回 0', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('MockEmbeddingService', () => {
  const svc = new MockEmbeddingService(64);

  it('默认维度为 1024', () => {
    expect(new MockEmbeddingService().dimension).toBe(1024);
  });
  it('同一文本产生确定性相同向量', async () => {
    const a = await svc.embed('高血压诊断标准');
    const b = await svc.embed('高血压诊断标准');
    expect(a).toEqual(b);
    expect(a.length).toBe(64);
  });
  it('向量已 L2 归一化', async () => {
    const v = await svc.embed('冠心病心绞痛');
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 3);
  });
  it('共享词元的文本相似度更高', async () => {
    const q = await svc.embed('高血压诊断');
    const a = await svc.embed('高血压诊断标准是什么');
    const b = await svc.embed('急性阑尾炎手术治疗');
    const sa = cosineSimilarity(q, a);
    const sb = cosineSimilarity(q, b);
    expect(sa).toBeGreaterThan(sb);
  });
  it('embedBatch 顺序与输入一致', async () => {
    const out = await svc.embedBatch(['阿司匹林', '氯吡格雷', '他汀']);
    expect(out.length).toBe(3);
    expect(out[0].length).toBe(64);
  });
});

describe('LocalVectorStore', () => {
  const DIM = 64;

  function rec(id: string, content: string, meta: Partial<VectorMetadata>): VectorRecord {
    return {
      id,
      content,
      vector: [],
      metadata: makeMeta(meta),
    };
  }

  it('增删查与统计', async () => {
    const store = new LocalVectorStore(DIM);
    const emb = new MockEmbeddingService(DIM);
    const docs = [
      rec('c1', '高血压诊断标准', {}),
      rec('c2', '高血压降压目标', {}),
      rec('c3', '急性阑尾炎手术', { department: '普外科', category: '临床路径' }),
    ];
    docs[0].vector = await emb.embed(docs[0].content);
    docs[1].vector = await emb.embed(docs[1].content);
    docs[2].vector = await emb.embed(docs[2].content);

    await store.addDocuments(docs);
    let stats = await store.getStats();
    expect(stats.totalRecords).toBe(3);
    expect(stats.distinctDocuments).toBe(1);

    // 检索：查询"高血压"应命中 c1/c2 在前
    const qv = await emb.embed('高血压');
    const hits = await store.search(qv, 2);
    expect(hits.length).toBe(2);
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[1].score);

    // 删除
    await store.delete(['c3']);
    stats = await store.getStats();
    expect(stats.totalRecords).toBe(2);
  });

  it('元数据过滤：科室过滤生效', async () => {
    const store = new LocalVectorStore(DIM);
    const emb = new MockEmbeddingService(DIM);
    const r1 = rec('r1', '心内科内容', { department: '心内科' });
    const r2 = rec('r2', '普外科内容', { department: '普外科' });
    r1.vector = await emb.embed(r1.content);
    r2.vector = await emb.embed(r2.content);
    await store.addDocuments([r1, r2]);

    const hits = await store.search(await emb.embed('内容'), 10, {
      filter: { departments: ['心内科'] },
    });
    expect(hits.length).toBe(1);
    expect(hits[0].record.metadata.department).toBe('心内科');
  });

  it('相似度阈值过滤生效', async () => {
    const store = new LocalVectorStore(DIM);
    const emb = new MockEmbeddingService(DIM);
    const r1 = rec('r1', '高血压', {});
    r1.vector = await emb.embed(r1.content);
    await store.addDocuments([r1]);
    const qv = await emb.embed('高血压');
    // 同文本向量余弦恒为 1.0，阈值 1.01 必为不可能值，应返回 0
    const strict = await store.search(qv, 10, { minScore: 1.01 });
    expect(strict.length).toBe(0);
  });

  it('update 更新向量与内容', async () => {
    const store = new LocalVectorStore(DIM);
    const emb = new MockEmbeddingService(DIM);
    const r1 = rec('u1', '旧内容', {});
    r1.vector = await emb.embed('旧内容');
    await store.addDocuments([r1]);
    const newVec = await emb.embed('新内容');
    await store.update('u1', newVec, '新内容');
    const all = await store.listAll();
    expect(all.find((x) => x.id === 'u1')?.content).toBe('新内容');
  });

  it('过期知识默认不被检索（activeOnly）', async () => {
    const store = new LocalVectorStore(DIM);
    const emb = new MockEmbeddingService(DIM);
    const r1 = rec('a1', '有效知识', { isActive: true });
    const r2 = rec('a2', '过期知识', { isActive: false });
    r1.vector = await emb.embed(r1.content);
    r2.vector = await emb.embed(r2.content);
    await store.addDocuments([r1, r2]);
    const hits = await store.search(await emb.embed('知识'), 10);
    expect(hits.every((h) => h.record.metadata.isActive)).toBe(true);
  });
});
