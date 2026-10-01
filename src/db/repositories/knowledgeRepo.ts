/**
 * 健澜科技 jlmedaios - 知识库 / 文档 / 分块 Repository（M4-A）
 *
 * knowledge.knowledge_bases / knowledge.documents / knowledge.chunks 读写。
 *
 * 摄入与检索：
 *  - 文档摄入：insertDocument（processing）→ 解析分块嵌入 → insertChunks（批量，
 *    embedding 以 jsonb 落库）→ updateDocumentStatus（ready）；
 *  - 检索：listAllChunks 取全量分块（含 embedding），由聚合器在应用层做
 *    向量余弦 + 关键词混合检索（无 pgvector 时的确定路径，见 90-pgvector-optional）。
 *
 * 并发与一致性：
 *  - 知识库 / 文档 / 分块删除按外键顺序，支持在同一事务内执行；
 *  - 所有函数接受可选事务句柄，保证摄入与审计同提交同回滚。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb, type DbExecutor } from '../pool.js';

// ============================================================================
// 类型
// ============================================================================

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

export interface NewKnowledgeBase {
  id: string;
  name: string;
  description?: string;
  authorityLevel?: string;
  source?: string;
  license?: string;
  version?: string;
}

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

export interface NewDocument {
  kbId: string;
  title: string;
  content: string;
  author?: string;
  publisher?: string;
  publishDate?: string;
  version?: string;
  docType?: string;
  authorityLevel?: string;
  sourceUrl?: string;
  license?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  kbId: string;
  chunkIndex: number;
  sectionPath: string | null;
  content: string;
  tokenCount: number;
  embedding: number[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NewChunk {
  documentId: string;
  kbId: string;
  chunkIndex: number;
  sectionPath?: string;
  content: string;
  tokenCount?: number;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 行映射
// ============================================================================

function mapKb(r: Record<string, unknown>): KnowledgeBase {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    authorityLevel: (r.authority_level as string) ?? null,
    source: (r.source as string) ?? null,
    license: (r.license as string) ?? null,
    version: (r.version as string) ?? null,
    enabled: r.enabled as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapDocument(r: Record<string, unknown>): KnowledgeDocument {
  return {
    id: r.id as string,
    kbId: r.kb_id as string,
    title: r.title as string,
    author: (r.author as string) ?? null,
    publisher: (r.publisher as string) ?? null,
    publishDate: (r.publish_date as string) ?? null,
    version: (r.version as string) ?? null,
    docType: (r.doc_type as string) ?? null,
    authorityLevel: (r.authority_level as string) ?? null,
    sourceUrl: (r.source_url as string) ?? null,
    license: (r.license as string) ?? null,
    content: r.content as string,
    status: r.status as string,
    metadata: parseJsonb(r.metadata),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapChunk(r: Record<string, unknown>): KnowledgeChunk {
  return {
    id: r.id as string,
    documentId: r.document_id as string,
    kbId: r.kb_id as string,
    chunkIndex: Number(r.chunk_index),
    sectionPath: (r.section_path as string) ?? null,
    content: r.content as string,
    tokenCount: Number(r.token_count ?? 0),
    embedding: parseJsonb(r.embedding),
    metadata: parseJsonb(r.metadata),
    createdAt: r.created_at as string,
  };
}

/** jsonb 列可能被驱动解析为对象，也可能返回字符串，统一兜底。 */
function parseJsonb(v: unknown): any {
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

// ============================================================================
// 知识库
// ============================================================================

export async function listKnowledgeBases(
  includeDisabled = false,
  tx?: DbExecutor,
): Promise<KnowledgeBase[]> {
  const db = tx ?? getDb();
  const rows = includeDisabled
    ? await db`SELECT * FROM knowledge.knowledge_bases ORDER BY id`
    : await db`SELECT * FROM knowledge.knowledge_bases WHERE enabled = true ORDER BY id`;
  return (rows as unknown as Record<string, unknown>[]).map(mapKb);
}

export async function getKnowledgeBase(id: string, tx?: DbExecutor): Promise<KnowledgeBase | null> {
  const db = tx ?? getDb();
  const rows = await db`SELECT * FROM knowledge.knowledge_bases WHERE id = ${id}`;
  const r = (rows as unknown as Record<string, unknown>[])[0];
  return r ? mapKb(r) : null;
}

export async function insertKnowledgeBase(input: NewKnowledgeBase, tx?: DbExecutor): Promise<KnowledgeBase> {
  const db = tx ?? getDb();
  const rows = await db`
    INSERT INTO knowledge.knowledge_bases
      (id, name, description, authority_level, source, license, version, enabled)
    VALUES (
      ${input.id}, ${input.name}, ${input.description ?? null},
      ${input.authorityLevel ?? 'general'}, ${input.source ?? '院内维护'},
      ${input.license ?? '院内私有'}, ${input.version ?? '1.0.0'}, true)
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = now()
    RETURNING *`;
  return mapKb((rows as unknown as Record<string, unknown>[])[0]);
}

export async function updateKnowledgeBase(
  id: string,
  patch: { name?: string; description?: string; enabled?: boolean },
  tx?: DbExecutor,
): Promise<KnowledgeBase | null> {
  const db = tx ?? getDb();
  const rows = await db`
    UPDATE knowledge.knowledge_bases SET
      name = COALESCE(${patch.name ?? null}, name),
      description = COALESCE(${patch.description ?? null}, description),
      enabled = COALESCE(${patch.enabled ?? null}, enabled),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *`;
  const r = (rows as unknown as Record<string, unknown>[])[0];
  return r ? mapKb(r) : null;
}

export async function deleteKnowledgeBase(id: string, tx?: DbExecutor): Promise<void> {
  const db = tx ?? getDb();
  await db`DELETE FROM knowledge.knowledge_bases WHERE id = ${id}`;
}

// ============================================================================
// 文档
// ============================================================================

export async function insertDocument(input: NewDocument, tx?: DbExecutor): Promise<KnowledgeDocument> {
  const db = tx ?? getDb();
  const id = randomUUID();
  const rows = await db`
    INSERT INTO knowledge.documents
      (id, kb_id, source_id, title, author, publisher, publish_date, version,
       doc_type, authority_level, source_url, license, metadata, content, status)
    VALUES (
      ${id}, ${input.kbId}, ${input.sourceId ?? null}, ${input.title},
      ${input.author ?? null}, ${input.publisher ?? null}, ${input.publishDate ?? null},
      ${input.version ?? '1.0.0'}, ${input.docType ?? 'guideline'},
      ${input.authorityLevel ?? null}, ${input.sourceUrl ?? null},
      ${input.license ?? '院内私有'},
      ${(input.metadata ?? {}) as any}, ${input.content}, 'processing')
    RETURNING *`;
  return mapDocument((rows as unknown as Record<string, unknown>[])[0]);
}

export async function getDocument(id: string, tx?: DbExecutor): Promise<KnowledgeDocument | null> {
  const db = tx ?? getDb();
  const rows = await db`SELECT * FROM knowledge.documents WHERE id = ${id}`;
  const r = (rows as unknown as Record<string, unknown>[])[0];
  return r ? mapDocument(r) : null;
}

export async function listDocumentsByKb(kbId: string, tx?: DbExecutor): Promise<KnowledgeDocument[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT * FROM knowledge.documents WHERE kb_id = ${kbId} ORDER BY created_at DESC`;
  return (rows as unknown as Record<string, unknown>[]).map(mapDocument);
}

export async function updateDocumentStatus(id: string, status: string, tx?: DbExecutor): Promise<void> {
  const db = tx ?? getDb();
  await db`UPDATE knowledge.documents SET status = ${status}, updated_at = now() WHERE id = ${id}`;
}

export async function deleteDocumentsByKb(kbId: string, tx?: DbExecutor): Promise<void> {
  const db = tx ?? getDb();
  await db`DELETE FROM knowledge.documents WHERE kb_id = ${kbId}`;
}

// ============================================================================
// 分块
// ============================================================================

export async function insertChunks(chunks: NewChunk[], tx?: DbExecutor): Promise<number> {
  if (chunks.length === 0) return 0;
  const db = tx ?? getDb();
  let inserted = 0;
  for (const c of chunks) {
    const id = randomUUID();
    await db`
      INSERT INTO knowledge.chunks
        (id, document_id, kb_id, chunk_index, section_path, content,
         token_count, embedding, metadata)
      VALUES (
        ${id}, ${c.documentId}, ${c.kbId}, ${c.chunkIndex},
        ${c.sectionPath ?? null}, ${c.content}, ${c.tokenCount ?? c.content.length},
        ${c.embedding as any}, ${(c.metadata ?? {}) as any})`;
    inserted++;
  }
  return inserted;
}

export async function listChunksByKb(kbId: string, tx?: DbExecutor): Promise<KnowledgeChunk[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT * FROM knowledge.chunks WHERE kb_id = ${kbId}
    ORDER BY document_id, chunk_index`;
  return (rows as unknown as Record<string, unknown>[]).map(mapChunk);
}

/** 检索用：取全量分块（含 embedding），可选限定知识库集合。 */
export async function listAllChunks(kbIds?: string[], tx?: DbExecutor): Promise<KnowledgeChunk[]> {
  const db = tx ?? getDb();
  const rows = kbIds && kbIds.length > 0
    ? await db`SELECT * FROM knowledge.chunks WHERE kb_id = ANY(${kbIds})`
    : await db`SELECT * FROM knowledge.chunks`;
  return (rows as unknown as Record<string, unknown>[]).map(mapChunk);
}

export async function deleteChunksByDocument(documentId: string, tx?: DbExecutor): Promise<void> {
  const db = tx ?? getDb();
  await db`DELETE FROM knowledge.chunks WHERE document_id = ${documentId}`;
}

export async function deleteChunksByKb(kbId: string, tx?: DbExecutor): Promise<void> {
  const db = tx ?? getDb();
  await db`DELETE FROM knowledge.chunks WHERE kb_id = ${kbId}`;
}
