/**
 * 健澜AI原生医院操作系统OS — 医疗知识中台
 *
 * 多源接入 → 加工流水线 → 知识图谱 → 向量/关键词/图谱混合检索（RRF）→
 * 术语标准化 → 多租户 → 版本与质量管理 的完整数据底座。
 *
 * 免责声明：本平台为医疗辅助工具，不替代医生诊断与处方决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './types';
export { HashingEncoder, type Encoder, tokenize, fnv1a, estimateTokens, contentFingerprint } from './util';
export {
  parseDocument,
  cleanText,
  chunkText,
  normalizeTerm,
  RuleBasedExtractor,
  buildChunks,
  type ExtractionResult,
} from './processing/pipeline';
export { KnowledgeGraph, type GraphImportPayload } from './graph/KnowledgeGraph';
export { HybridRetriever, KeywordIndex, VectorIndex, type HybridWeights, type HybridSearchOptions } from './retrieval/hybrid';
export { TerminologyService, diceSimilarity } from './terminology/TerminologyService';
export { TenantManager } from './tenant/TenantManager';
export { VersionManager, scoreTerms, diffIncremental } from './version/VersionManager';
export {
  ConnectorRegistry,
  FileConnector,
  ApiConnector,
  DatabaseConnector,
  CrawlerConnector,
  TerminologyConnector,
  type Connector,
} from './sources/connectors';
export { JsonFileStore, MemoryStore, type KVStore } from './store/FileStore';
export { KnowledgeService, type KnowledgeServiceOptions } from './service/KnowledgeService';

// ===== S-11 RAG 知识生命周期基础（六域台账 / 六要素拦截 / 状态机 / 评审周期） =====
export * from './lifecycle';

// ===== S-12 引用编号协议与检索质量闭环（后端协议先行） =====
export * from './citation';

// ===== S-13 患者级隔离索引与越权审计（分区强制过滤 / 阻断入审计链） =====
export * from './isolation';

/** 医疗辅助免责声明（所有知识服务输出统一附带） */
export const MEDICAL_DISCLAIMER =
  '本结果由健澜AI原生医院操作系统OS智能体辅助生成，仅供医务人员参考，不替代医生的诊断、治疗与处方决策。';
