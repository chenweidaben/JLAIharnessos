/**
 * 健澜科技杠OS（GangOS / Jianlan OS）— 医疗知识中台
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

/** 医疗辅助免责声明（所有知识服务输出统一附带） */
export const MEDICAL_DISCLAIMER =
  '本结果由健澜科技杠OS智能体辅助生成，仅供医务人员参考，不替代医生的诊断、治疗与处方决策。';
