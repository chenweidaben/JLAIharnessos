/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 知识库与 RAG 模块统一出口。
 */

// 领域类型
export * from './types';

// 向量存储层
export type { EmbeddingService } from './vector/EmbeddingService';
export {
  DEFAULT_EMBEDDING_DIMENSION,
  MockEmbeddingService,
  tokenize,
} from './vector/EmbeddingService';
export { cosineSimilarity, LocalVectorStore } from './vector/LocalVectorStore';
export type { VectorStore, VectorStoreStats } from './vector/VectorStore';

// 文档处理层
export type { Chunk } from './processing/Chunk';
export { buildChunkId } from './processing/Chunk';
export type { DocumentBlock, DocumentMetadata, ParsedDocument } from './processing/DocumentParser';
export { DocumentParser } from './processing/DocumentParser';
export type { SplitterConfig } from './processing/TextSplitter';
export { DEFAULT_SPLITTER_CONFIG, TextSplitter } from './processing/TextSplitter';

// 检索引擎层
export type { BuiltContext } from './retrieval/ContextBuilder';
export { ContextBuilder } from './retrieval/ContextBuilder';
export { QueryUnderstanding } from './retrieval/QueryUnderstanding';
export type { CrossEncoderScorer, RerankedCandidate } from './retrieval/Reranker';
export { levelAuthorityWeight, Reranker } from './retrieval/Reranker';
export type { RetrievalEngineOptions, RetrievalResponse } from './retrieval/RetrievalEngine';
export { RetrievalEngine } from './retrieval/RetrievalEngine';

// 知识库管理层
export type { IngestResult, KnowledgeBaseStats } from './management/KnowledgeBaseManager';
export { KnowledgeBaseManager } from './management/KnowledgeBaseManager';
export type { KnowledgeSource, KnowledgeVersion } from './management/KnowledgeSource';
export { KnowledgeSourceBuilder } from './management/KnowledgeSource';

// Mock 数据
export type { MockDrugLabel } from './mock/mockKnowledgeBase';
export { buildMockKnowledgeSources, MOCK_DRUG_LABELS } from './mock/mockKnowledgeBase';

// 引导
export {
  getSharedKnowledgeBase,
  getSharedRetrievalEngine,
  resetSharedKnowledgeBase,
} from './bootstrap';
