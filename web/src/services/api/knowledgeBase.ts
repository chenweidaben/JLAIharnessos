/**
 * 健澜科技 jlmedaios - 知识库管理与 RAG 检索 API（M4-A）
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { del, get, post, put } from '../request';
import type {
  CreateKbInput,
  IngestDocumentInput,
  IngestResult,
  KnowledgeBase,
  KnowledgeDocument,
  RetrievalResult,
} from '@/types/knowledgeBase';

/** 知识库列表。 */
export function listKbsApi(): Promise<KnowledgeBase[]> {
  return get('/kb');
}

/** 新建知识库。 */
export function createKbApi(input: CreateKbInput): Promise<KnowledgeBase> {
  return post('/kb', input);
}

/** 知识库详情。 */
export function getKbApi(id: string): Promise<KnowledgeBase> {
  return get(`/kb/${id}`);
}

/** 更新知识库。 */
export function updateKbApi(
  id: string,
  patch: { name?: string; description?: string; enabled?: boolean },
): Promise<KnowledgeBase> {
  return put(`/kb/${id}`, patch);
}

/** 删除知识库。 */
export function deleteKbApi(id: string): Promise<{ deleted: string }> {
  return del(`/kb/${id}`);
}

/** 文档列表。 */
export function listDocumentsApi(kbId: string): Promise<KnowledgeDocument[]> {
  return get(`/kb/${kbId}/documents`);
}

/** 摄入文档（解析、分块、嵌入、索引）。 */
export function ingestDocumentApi(
  kbId: string,
  input: IngestDocumentInput,
): Promise<IngestResult> {
  return post(`/kb/${kbId}/documents`, input);
}

/** RAG 混合检索。 */
export function retrieveApi(
  query: string,
  options: { kbIds?: string[]; topK?: number } = {},
): Promise<RetrievalResult[]> {
  return post('/kb/retrieve', { query, ...options });
}
