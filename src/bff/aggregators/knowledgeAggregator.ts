/**
 * 健澜科技 jlmedaios - 知识库管理与 RAG 检索聚合器（M4-A）
 *
 * 知识库 CRUD、文档摄入（解析 → 分块 → 嵌入 → 落库）、检索增强生成（RAG）
 * 混合检索（向量余弦 + 关键词重叠）。
 *
 * 安全边界：
 *  - 知识库为全院共享资源，读写经 knowledge:read / knowledge:manage 权限（路由层强制）；
 *  - 文档记录采用“作业表”模式先落库（processing）；处理（分块/嵌入/审计）同事务
 *    提交或回滚，失败时文档保留为 failed，便于追溯与重试；
 *  - 无 pgvector 时采用应用层余弦检索（确定性，见 90-pgvector-optional）；
 *  - 嵌入提供方可插拔：本地演示嵌入明确标注，真实提供方失败不返回假向量。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import {
  deleteChunksByKb,
  deleteDocumentsByKb,
  deleteKnowledgeBase,
  getDocument,
  getKnowledgeBase,
  insertChunks,
  insertDocument,
  insertKnowledgeBase,
  listAllChunks,
  listDocumentsByKb,
  listKnowledgeBases,
  updateDocumentStatus,
  updateKnowledgeBase,
  type KnowledgeBase,
  type KnowledgeChunk,
  type KnowledgeDocument,
  type NewChunk,
} from '../../db/repositories/knowledgeRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import type { EmbeddingService } from '../../knowledge/vector/EmbeddingService.js';
import { tokenize } from '../../knowledge/vector/EmbeddingService.js';
import { cosineSimilarity } from '../../knowledge/vector/LocalVectorStore.js';
import { createEmbeddingProviderFromEnv } from '../../knowledge/embeddings/createEmbeddingProvider.js';
import { chunkText, parseDocument } from '../../knowledge-platform/processing/pipeline.js';
import type { AuthView } from '../view/userView.js';

export class KnowledgeError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'KnowledgeError';
  }
}

const badRequest = (m: string) => new KnowledgeError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new KnowledgeError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new KnowledgeError(409, 'CONFLICT', m);

// ============================================================================
// 嵌入提供方（模块级懒加载单例，可由测试注入替换）
// ============================================================================

let embeddingSingleton: EmbeddingService | null = null;

function getEmbedding(): EmbeddingService {
  if (!embeddingSingleton) {
    embeddingSingleton = createEmbeddingProviderFromEnv();
  }
  return embeddingSingleton;
}

/** 仅供测试注入嵌入提供方。 */
export function setEmbeddingServiceForTest(service: EmbeddingService | null): void {
  embeddingSingleton = service;
}

// ============================================================================
// 检索结果
// ============================================================================

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

export interface IngestResult {
  document: KnowledgeDocument;
  chunkCount: number;
  embeddingProvider: string;
}

// ============================================================================
// 知识库 CRUD
// ============================================================================

export async function listKbs(actor: AuthView): Promise<KnowledgeBase[]> {
  return listKnowledgeBases(false);
}

export async function createKb(
  actor: AuthView,
  input: { id: string; name: string; description?: string; authorityLevel?: string },
): Promise<KnowledgeBase> {
  const id = input.id.trim();
  const name = input.name.trim();
  if (!id || !name) throw badRequest('知识库标识与名称不能为空');
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
    throw badRequest('知识库标识仅允许小写字母、数字、连字符，且以字母或数字开头');
  }
  if (await getKnowledgeBase(id)) throw conflict(`知识库标识 ${id} 已存在`);

  return withTx(async (tx) => {
    const kb = await insertKnowledgeBase(
      { id, name, description: input.description, authorityLevel: input.authorityLevel },
      tx,
    );
    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'knowledge.kb.create',
        resourceType: 'knowledge_base',
        resourceId: id,
        result: 'success',
        riskLevel: 'low',
        detail: { name },
      },
      tx,
    );
    return kb;
  });
}

export async function getKb(actor: AuthView, id: string): Promise<KnowledgeBase> {
  const kb = await getKnowledgeBase(id);
  if (!kb) throw notFound('知识库不存在');
  return kb;
}

export async function updateKb(
  actor: AuthView,
  id: string,
  patch: { name?: string; description?: string; enabled?: boolean },
): Promise<KnowledgeBase> {
  if (!(await getKnowledgeBase(id))) throw notFound('知识库不存在');
  const kb = await updateKnowledgeBase(id, patch);
  if (!kb) throw notFound('知识库不存在');
  return kb;
}

export async function deleteKb(actor: AuthView, id: string): Promise<void> {
  if (!(await getKnowledgeBase(id))) throw notFound('知识库不存在');

  await withTx(async (tx) => {
    // 按外键顺序：分块 → 文档 → 知识库
    await deleteChunksByKb(id, tx);
    await deleteDocumentsByKb(id, tx);
    await deleteKnowledgeBase(id, tx);
    await recordChainAudit(
      {
        actorId: actor.id,
        action: 'knowledge.kb.delete',
        resourceType: 'knowledge_base',
        resourceId: id,
        result: 'success',
        riskLevel: 'medium',
        detail: {},
      },
      tx,
    );
  });
}

// ============================================================================
// 文档摄入
// ============================================================================

export async function ingestDocument(
  actor: AuthView,
  kbId: string,
  input: {
    title: string;
    content: string;
    format?: 'txt' | 'md' | 'html' | 'json' | 'csv';
    author?: string;
    publisher?: string;
    docType?: string;
    sourceUrl?: string;
  },
): Promise<IngestResult> {
  const title = input.title.trim();
  const content = input.content ?? '';
  if (!title) throw badRequest('文档标题不能为空');
  if (!content.trim()) throw badRequest('文档正文不能为空');
  if (!(await getKnowledgeBase(kbId))) throw notFound('目标知识库不存在');

  const embedding = getEmbedding();

  // 1. 先创建文档记录（processing，独立事务提交）。
  //    采用“作业表”模式：文档记录先落库，便于后续处理失败时保留 failed 状态可追溯。
  const doc = await withTx(async (tx) =>
    insertDocument(
      {
        kbId,
        title,
        content,
        author: input.author,
        publisher: input.publisher,
        docType: input.docType ?? 'guideline',
        sourceUrl: input.sourceUrl,
        metadata: { createdBy: actor.id, format: input.format ?? 'txt' },
      },
      tx,
    ),
  );

  try {
    // 2. 解析 → 分块 → 嵌入 → 落分块 → 就绪，全程同一事务（含审计）
    return await withTx(async (tx) => {
      // 2.1 解析（识别章节）
      const nowIso = new Date().toISOString();
      const parsed = parseDocument({
        id: doc.id,
        knowledgeBaseId: kbId,
        title,
        content,
        format: input.format ?? 'txt',
        createdAt: nowIso,
        provenance: {
          sourceId: doc.id,
          sourceName: input.publisher ?? '院内维护',
          version: '1.0.0',
          publisher: input.publisher,
          url: input.sourceUrl,
          license: '院内私有',
          fetchedAt: nowIso,
        },
        tenantId: 'default',
        tags: [],
      });

      // 2.2 分块（按章节优先，回退滑动窗口）
      const pieces = chunkText(parsed.text, parsed.sections, {
        strategy: 'section',
        chunkSize: 800,
        overlap: 80,
      });

      // 2.3 批量嵌入
      const vectors = await embedding.embedBatch(pieces.map((p) => p.content));

      // 2.4 落分块
      const newChunks: NewChunk[] = pieces.map((p, i) => ({
        documentId: doc.id,
        kbId,
        chunkIndex: p.index ?? i,
        sectionPath: p.sectionPath,
        content: p.content,
        tokenCount: p.content.length,
        embedding: vectors[i],
      }));
      const chunkCount = await insertChunks(newChunks, tx);

      // 2.5 文档就绪
      await updateDocumentStatus(doc.id, 'ready', tx);

      await recordChainAudit(
        {
          actorId: actor.id,
          action: 'knowledge.document.ingest',
          resourceType: 'knowledge_document',
          resourceId: doc.id,
          result: 'success',
          riskLevel: 'low',
          detail: { kbId, chunkCount, embeddingProvider: (embedding as { name?: string }).name },
        },
        tx,
      );

      const refreshed = await getDocument(doc.id, tx);
      return {
        document: refreshed ?? doc,
        chunkCount,
        embeddingProvider: (embedding as { name?: string }).name ?? 'unknown',
      };
    });
  } catch (err) {
    // 3. 处理失败：在独立事务中标记 failed（文档记录已先提交，不会被回滚）
    await withTx(async (tx) => {
      await updateDocumentStatus(doc.id, 'failed', tx);
    }).catch(() => {});
    throw err;
  }
}

export async function listDocuments(actor: AuthView, kbId: string): Promise<KnowledgeDocument[]> {
  if (!(await getKnowledgeBase(kbId))) throw notFound('知识库不存在');
  return listDocumentsByKb(kbId);
}

// ============================================================================
// RAG 混合检索
// ============================================================================

/**
 * 中文医疗查询停用字（疑问代词、结构助词、连词、介词）。
 * 用于过滤中文 bigram 中不含实质语义的片段（如“什么/怎么/的/是”），
 * 避免“是什么”这类疑问词稀释关键词覆盖率。英文/数字 token 始终保留。
 */
const QUERY_STOP_CHARS = new Set(
  '的了是吗呢什么怎样如何哪些请问在和与及或把被让给对于了啊呀吧哦'.split(''),
);

/** 提取查询中有实质意义的 token（英文/数字保留；中文 bigram 去除含停用字的片段） */
function meaningfulQueryTokens(query: string): Set<string> {
  const out = new Set<string>();
  for (const raw of tokenize(query)) {
    const t = raw.toLowerCase();
    if (/^[a-z0-9]+$/.test(t)) {
      out.add(t);
      continue;
    }
    // 中文 bigram：任一字为停用字则视为跨边界/无意义片段，过滤
    const chars = [...t];
    if (chars.length > 0 && chars.every((ch) => !QUERY_STOP_CHARS.has(ch))) {
      out.add(t);
    }
  }
  return out;
}

export async function retrieve(
  actor: AuthView,
  query: string,
  options: { kbIds?: string[]; topK?: number } = {},
): Promise<RetrievalResult[]> {
  const q = query.trim();
  if (!q) throw badRequest('检索词不能为空');
  const topK = options.topK ?? 5;

  const embedding = getEmbedding();
  const queryVector = await embedding.embed(q);
  const queryTokens = meaningfulQueryTokens(q);

  const chunks: KnowledgeChunk[] = await listAllChunks(options.kbIds);
  if (chunks.length === 0) return [];

  const scored: Array<{ chunk: KnowledgeChunk; vectorScore: number; keywordScore: number }> = [];
  for (const c of chunks) {
    const vec = Array.isArray(c.embedding) && c.embedding.length > 0 ? c.embedding : null;
    const vectorScore = vec ? cosineSimilarity(queryVector, vec) : 0;

    // 关键词覆盖：命中多少个“不同的”查询 token / 查询 token 数（查询意图覆盖率）
    let keywordScore = 0;
    if (queryTokens.size > 0) {
      const chunkTokenSet = new Set(
        tokenize(c.content).map((t) => t.toLowerCase()),
      );
      let hit = 0;
      for (const t of queryTokens) if (chunkTokenSet.has(t)) hit++;
      keywordScore = hit / queryTokens.size;
    }

    scored.push({ chunk: c, vectorScore: Math.max(0, vectorScore), keywordScore });
  }

  // 混合：0.6 向量（语义）+ 0.4 关键词（精确意图覆盖）
  const ranked = scored
    .map((s) => ({
      chunk: s.chunk,
      vectorScore: s.vectorScore,
      keywordScore: s.keywordScore,
      score: 0.6 * s.vectorScore + 0.4 * s.keywordScore,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // 关联文档来源信息
  const results: RetrievalResult[] = [];
  for (const r of ranked) {
    const doc = await getDocument(r.chunk.documentId);
    results.push({
      chunkId: r.chunk.id,
      kbId: r.chunk.kbId,
      documentId: r.chunk.documentId,
      documentTitle: doc?.title ?? '未知文档',
      sectionPath: r.chunk.sectionPath,
      content: r.chunk.content,
      score: Number(r.score.toFixed(4)),
      vectorScore: Number(r.vectorScore.toFixed(4)),
      keywordScore: Number(r.keywordScore.toFixed(4)),
      publisher: doc?.publisher ?? null,
      author: doc?.author ?? null,
    });
  }
  return results;
}
