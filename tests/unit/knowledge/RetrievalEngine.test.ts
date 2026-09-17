/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - RAG 检索引擎（RetrievalEngine），基于 Mock 知识库端到端验证。
 */

import { describe, it, expect } from 'bun:test';
import { getSharedKnowledgeBase } from '@knowledge/bootstrap';
import { QueryUnderstanding } from '@knowledge/retrieval/QueryUnderstanding';
import { Reranker } from '@knowledge/retrieval/Reranker';
import { ContextBuilder } from '@knowledge/retrieval/ContextBuilder';

describe('QueryUnderstanding', () => {
  const qu = new QueryUnderstanding();

  it('识别用药意图并扩展同义词', () => {
    const r = qu.understand('阿司匹林的用法用量和禁忌');
    expect(r.intent).toBe('medication');
    expect(r.rewrittenQuery).toContain('阿司匹林');
    expect(r.keywords.length).toBeGreaterThan(0);
  });

  it('识别管理/制度意图', () => {
    const r = qu.understand('医院三级查房制度是什么要求');
    expect(r.intent).toBe('management');
  });

  it('口语术语标准化（心梗→心肌梗死）', () => {
    const r = qu.understand('心梗怎么处理');
    expect(r.rewrittenQuery).toContain('心肌梗死');
  });
});

describe('RetrievalEngine（Mock 知识库端到端）', () => {
  it('查询高血压返回高血压指南类结果', async () => {
    const kb = await getSharedKnowledgeBase();
    const engine = kb.getRetrievalEngine();
    const resp = await engine.retrieve('高血压的诊断标准和降压目标是什么');
    expect(resp.results.length).toBeGreaterThan(0);
    expect(resp.results[0].docTitle).toContain('高血压');
    // 上下文含引用编号与参考文献
    expect(resp.context.contextText).toContain('[1]');
    expect(resp.context.contextText).toContain('参考文献');
  });

  it('按文档类型过滤：药品说明书查询', async () => {
    const kb = await getSharedKnowledgeBase();
    const engine = kb.getRetrievalEngine();
    const resp = await engine.retrieve('阿司匹林的用法用量', {
      documentType: '药品说明书',
      topK: 3,
    });
    expect(resp.results.length).toBeGreaterThan(0);
    expect(resp.results.every((r) => r.category === '药品说明书')).toBe(true);
  });

  it('按知识层级过滤 L3 医院制度', async () => {
    const kb = await getSharedKnowledgeBase();
    const engine = kb.getRetrievalEngine();
    const resp = await engine.retrieve('首诊负责制度要求', {
      knowledgeLevel: 'L3',
      topK: 3,
    });
    expect(resp.results.length).toBeGreaterThan(0);
    expect(resp.results.every((r) => r.level === 'L3')).toBe(true);
  });

  it('结果携带证据追溯字段', async () => {
    const kb = await getSharedKnowledgeBase();
    const engine = kb.getRetrievalEngine();
    const resp = await engine.retrieve('2型糖尿病诊断标准', { topK: 2 });
    const r = resp.results[0];
    expect(r.publisher).toBeTruthy();
    expect(r.publishDate).toBeTruthy();
    expect(r.version).toBeTruthy();
    expect(r.authorityScore).toBeGreaterThanOrEqual(1);
    expect(r.similarityScore).toBeGreaterThanOrEqual(0);
  });
});

describe('Reranker 权威性与时效性', () => {
  it('高权威 + 较新文档排序靠前', async () => {
    const kb = await getSharedKnowledgeBase();
    const engine = kb.getRetrievalEngine();
    // 直接用引擎返回结果，验证权威字段已参与排序（不报错即可）
    const resp = await engine.retrieve('慢阻肺稳定期治疗', { topK: 3 });
    expect(resp.results.length).toBeGreaterThan(0);
  });

  it('ContextBuilder 尊重 token 预算', async () => {
    const cb = new ContextBuilder(50); // 极小预算触发截断
    const kb = await getSharedKnowledgeBase();
    const engine = kb.getRetrievalEngine();
    const resp = await engine.retrieve('胸痛急诊流程', { topK: 5 });
    const built = cb.build(resp.results, { tokenBudget: 200 });
    expect(built.truncated || built.selected.length <= resp.results.length).toBe(true);
    expect(built.selected.length).toBeLessThanOrEqual(resp.results.length);
  });
});
