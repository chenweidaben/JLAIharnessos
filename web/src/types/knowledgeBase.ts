/**
 * 健澜科技 jlmedaios - 知识库管理与 RAG 检索类型（M4-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 知识库。 */
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  authorityLevel: string | null;
  source: string | null;
  license: string | null;
  version: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 文档。 */
export interface KnowledgeDocument {
  id: string;
  kbId: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishDate: string | null;
  version: string | null;
  docType: string | null;
  authorityLevel: string | null;
  sourceUrl: string | null;
  license: string | null;
  content: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** 新建知识库输入。 */
export interface CreateKbInput {
  id: string;
  name: string;
  description?: string;
  authorityLevel?: string;
}

/** 摄入文档输入。 */
export interface IngestDocumentInput {
  title: string;
  content: string;
  format?: 'txt' | 'md' | 'html' | 'json' | 'csv';
  author?: string;
  publisher?: string;
  docType?: string;
  sourceUrl?: string;
}

/** 摄入结果。 */
export interface IngestResult {
  document: KnowledgeDocument;
  chunkCount: number;
  embeddingProvider: string;
}

/** RAG 检索结果（带来源）。 */
export interface RetrievalResult {
  chunkId: string;
  kbId: string;
  documentId: string;
  documentTitle: string;
  sectionPath: string | null;
  content: string;
  score: number;
  vectorScore: number;
  keywordScore: number;
  publisher: string | null;
  author: string | null;
}
