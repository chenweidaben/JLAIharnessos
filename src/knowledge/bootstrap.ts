/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 知识库引导（Bootstrap）。
 * 装配开发环境默认的知识库：Mock 嵌入服务 + 本地向量存储 + Mock 医学文档入库，
 * 对外提供可直接使用的检索引擎单例。生产环境应替换为真实 Embedding 与 pgvector。
 */

import { KnowledgeBaseManager } from './management/KnowledgeBaseManager';
import { buildMockKnowledgeSources } from './mock/mockKnowledgeBase';
import { MockEmbeddingService } from './vector/EmbeddingService';
import { LocalVectorStore } from './vector/LocalVectorStore';

/** 默认向量维度 */
const DIMENSION = 1024;

/** 已初始化的知识库管理器（懒加载单例） */
let sharedManager: KnowledgeBaseManager | null = null;
let initializing: Promise<KnowledgeBaseManager> | null = null;

/**
 * 获取（必要时初始化）共享知识库管理器。
 *
 * 首次调用会构建 Mock 嵌入服务、本地向量存储，并将全部 Mock 医学文档入库。
 * 后续调用复用同一实例，避免重复建库。
 *
 * @returns 知识库管理器
 */
export async function getSharedKnowledgeBase(): Promise<KnowledgeBaseManager> {
  if (sharedManager) return sharedManager;
  if (initializing) return initializing;

  initializing = (async () => {
    const embedding = new MockEmbeddingService(DIMENSION);
    const store = new LocalVectorStore(DIMENSION);
    await store.load();
    const manager = new KnowledgeBaseManager(embedding, store);

    // 若向量库已有持久化数据且非空，直接复用
    const all = await store.listAll();
    if (all.length === 0) {
      const sources = buildMockKnowledgeSources();
      for (const src of sources) {
        await manager.ingest(src);
      }
    } else {
      // 持久化数据存在时，仍需把知识源元数据登记到 manager
      // （开发演示场景下重新入库 Mock 数据以保证 publisher 等元数据完整）
      const sources = buildMockKnowledgeSources();
      for (const src of sources) {
        await manager.ingest(src);
      }
    }

    sharedManager = manager;
    return manager;
  })();

  return initializing;
}

/**
 * 获取共享检索引擎的便捷方法。
 *
 * @returns 检索引擎
 */
export async function getSharedRetrievalEngine(): Promise<
  ReturnType<KnowledgeBaseManager['getRetrievalEngine']>
> {
  const manager = await getSharedKnowledgeBase();
  return manager.getRetrievalEngine();
}

/**
 * 重置共享知识库（主要用于测试隔离）。
 */
export async function resetSharedKnowledgeBase(): Promise<void> {
  sharedManager = null;
  initializing = null;
}
