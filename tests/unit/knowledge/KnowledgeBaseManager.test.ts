/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 知识库管理器（KnowledgeBaseManager）
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { KnowledgeBaseManager } from '@knowledge/management/KnowledgeBaseManager';
import { KnowledgeSourceBuilder } from '@knowledge/management/KnowledgeSource';
import { MockEmbeddingService } from '@knowledge/vector/EmbeddingService';
import { LocalVectorStore } from '@knowledge/vector/LocalVectorStore';

const DIM = 256;

function makeManager(): KnowledgeBaseManager {
  const emb = new MockEmbeddingService(DIM);
  const store = new LocalVectorStore(DIM);
  return new KnowledgeBaseManager(emb, store);
}

describe('KnowledgeBaseManager', () => {
  let manager: KnowledgeBaseManager;

  beforeEach(() => {
    manager = makeManager();
  });

  it('知识入库：解析切分嵌入存储后统计正确', async () => {
    const src = new KnowledgeSourceBuilder(
      'KB-T-001',
      '高血压指南',
      '## 诊断\n收缩压≥140mmHg。\n## 治疗\n血压目标<140/90。',
    ).build();

    const result = await manager.ingest(src);
    expect(result.knowledgeId).toBe('KB-T-001');
    expect(result.chunkCount).toBeGreaterThan(0);

    const stats = await manager.stats();
    expect(stats.sourceCount).toBe(1);
    expect(stats.chunkCount).toBe(result.chunkCount);
    expect(stats.byLevel.L2).toBe(1);
  });

  it('getSource / listSources', async () => {
    const src = new KnowledgeSourceBuilder('KB-T-002', '糖尿病指南', '## 诊断\n空腹血糖≥7.0。').build();
    await manager.ingest(src);
    expect(manager.getSource('KB-T-002')?.title).toBe('糖尿病指南');
    expect(manager.listSources().length).toBe(1);
  });

  it('remove 删除知识源及其向量', async () => {
    const src = new KnowledgeSourceBuilder('KB-T-003', '待删文档', '内容。').build();
    await manager.ingest(src);
    await manager.remove('KB-T-003');
    expect(manager.getSource('KB-T-003')).toBeUndefined();
    const stats = await manager.stats();
    expect(stats.sourceCount).toBe(0);
  });

  it('publishNewVersion 保留历史版本', async () => {
    const v1 = new KnowledgeSourceBuilder('KB-T-004', '指南', 'v1内容。').version('v1.0.0', '2023-01-01').build();
    await manager.ingest(v1);
    const v2 = new KnowledgeSourceBuilder('KB-T-004', '指南', 'v2内容更新。').version('v2.0.0', '2024-01-01').build();
    const res = await manager.publishNewVersion(v2);
    expect(res.chunkCount).toBeGreaterThan(0);
    const current = manager.getSource('KB-T-004');
    expect(current?.version.previousVersion).toBe('v1.0.0');
    expect(current?.version.currentVersion).toBe('v2.0.0');
  });

  it('resolvePublisher 返回发布机构', async () => {
    const src = new KnowledgeSourceBuilder('KB-T-005', '指南', '内容。')
      .publisher('中华医学会')
      .build();
    await manager.ingest(src);
    expect(manager.resolvePublisher('KB-T-005')).toBe('中华医学会');
  });

  it('getRetrievalEngine 可执行检索', async () => {
    const src = new KnowledgeSourceBuilder('KB-T-006', '冠心病', '## 治疗\n阿司匹林抗血小板。')
      .tags(['冠心病', '阿司匹林'])
      .build();
    await manager.ingest(src);
    const engine = manager.getRetrievalEngine();
    const resp = await engine.retrieve('冠心病 抗血小板');
    expect(resp.results.length).toBeGreaterThan(0);
    expect(resp.context.contextText).toContain('参考文献');
  });
});
