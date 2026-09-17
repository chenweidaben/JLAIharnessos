/**
 * 健澜科技杠OS — 医疗知识中台统一服务门面
 *
 * 聚合：知识库 CRUD、文档接入与加工、术语库装载、知识图谱、统一混合检索、
 *       术语标准化、图谱查询、版本/质量、知识问答（供 Agent 工具调用）。
 *
 * 这是编排层 RAG 节点、低代码知识库管理界面、Agent 知识工具的唯一后端入口。
 *
 * 免责声明：检索与问答结果为辅助参考，不构成诊断或治疗依据，不替代医生决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type ConnectorConfig,
  type DocumentIndexStatus,
  type GraphEntity,
  type KnowledgeBase,
  type KnowledgeChunk,
  type QualityReport,
  type RawDocument,
  type RetrievalResponse,
  type SourceProvenance,
  type StandardizationResult,
  type TermEntry,
} from '../types';
import { HashingEncoder, type Encoder, shortId } from '../util';
import { buildChunks, type RuleBasedExtractor } from '../processing/pipeline';
import { KnowledgeGraph, type GraphImportPayload } from '../graph/KnowledgeGraph';
import { HybridRetriever } from '../retrieval/hybrid';
import { TerminologyService } from '../terminology/TerminologyService';
import { TenantManager } from '../tenant/TenantManager';
import { VersionManager, diffIncremental, scoreTerms } from '../version/VersionManager';
import { ConnectorRegistry } from '../sources/connectors';
import { type KVStore, MemoryStore } from '../store/FileStore';

export interface KnowledgeServiceOptions {
  encoder?: Encoder;
  store?: KVStore;
  connectors?: ConnectorRegistry;
  /** 持久化是否落盘（测试可关闭） */
  persist?: boolean;
}

const DEFAULT_CHUNK = { strategy: 'section' as const, chunkSize: 800, overlap: 80 };

export class KnowledgeService {
  readonly encoder: Encoder;
  readonly graph = new KnowledgeGraph();
  readonly terminology = new TerminologyService();
  readonly tenants = new TenantManager();
  readonly versions = new VersionManager();
  readonly retriever: HybridRetriever;
  private store: KVStore;
  private connectors: ConnectorRegistry;
  private kbs = new Map<string, KnowledgeBase>();
  private documents = new Map<string, RawDocument>();
  private chunks = new Map<string, KnowledgeChunk>();
  private terms: TermEntry[] = [];
  private termsBySource = new Map<string, TermEntry[]>();
  private indexStatus = new Map<string, DocumentIndexStatus>();
  private extractor: RuleBasedExtractor | undefined;

  constructor(opts: KnowledgeServiceOptions = {}) {
    this.encoder = opts.encoder ?? new HashingEncoder(512);
    this.store = opts.store ?? new MemoryStore();
    this.connectors = opts.connectors ?? ConnectorRegistry.withDefaults();
    this.retriever = new HybridRetriever(this.encoder, this.graph, () => this.terms);
  }

  // --------------------------------------------------------------------------
  // 知识库管理
  // --------------------------------------------------------------------------

  async createKb(input: Partial<KnowledgeBase> & { name: string }): Promise<KnowledgeBase> {
    const now = new Date().toISOString();
    const kb: KnowledgeBase = {
      id: input.id ?? shortId('kb'),
      name: input.name,
      description: input.description ?? '',
      kind: input.kind ?? 'mixed',
      category: input.category ?? '通用',
      tenantId: input.tenantId ?? 'public',
      chunk: input.chunk ?? DEFAULT_CHUNK,
      retrieval: input.retrieval ?? {
        topK: 5,
        candidateK: 30,
        weights: { vector: 0.45, keyword: 0.35, graph: 0.2 },
        minScore: 0.02,
        rrfK: 60,
      },
      sources: input.sources ?? [],
      documentCount: 0,
      chunkCount: 0,
      indexStatus: 'empty',
      isPublic: input.isPublic ?? true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.kbs.set(kb.id, kb);
    this.retriever.registerKb(kb.id);
    await this.persist();
    return kb;
  }

  listKbs(tenantId?: string): KnowledgeBase[] {
    const all = [...this.kbs.values()];
    if (!tenantId) return all;
    const visible = this.tenants.visibleScopes(tenantId);
    return all.filter((k) => k.isPublic || visible.includes(k.tenantId));
  }

  getKb(id: string): KnowledgeBase | undefined {
    return this.kbs.get(id);
  }

  async updateKb(id: string, patch: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const kb = this.requireKb(id);
    Object.assign(kb, patch, { updatedAt: new Date().toISOString() });
    await this.persist();
    return kb;
  }

  async deleteKb(id: string): Promise<void> {
    const chunks = [...this.chunks.values()].filter((c) => c.knowledgeBaseId === id);
    chunks.forEach((c) => this.retriever.removeDocumentChunks(c.documentId));
    this.chunks.forEach((_v, key) => {
      if (this.chunks.get(key)?.knowledgeBaseId === id) this.chunks.delete(key);
    });
    this.kbs.delete(id);
    await this.persist();
  }

  // --------------------------------------------------------------------------
  // 文档接入 + 加工
  // --------------------------------------------------------------------------

  /** 通过接入器配置抓取并入库加工 */
  async ingestFromConnector(kbId: string, config: ConnectorConfig): Promise<{ documents: number; chunks: number }> {
    this.requireKb(kbId);
    const provenance = this.provenanceFrom(config);
    const connector = this.connectors.get(config.kind);
    const raws = await connector.fetch(config, provenance, kbId);
    let chunkCount = 0;
    for (const raw of raws) chunkCount += (await this.ingestDocument(raw)).chunks;
    return { documents: raws.length, chunks: chunkCount };
  }

  /** 直接上传文本内容入库（前端上传/粘贴） */
  async ingestText(kbId: string, title: string, content: string, format: RawDocument['format'] = 'txt', tags: string[] = []): Promise<{ documentId: string; chunks: number }> {
    this.requireKb(kbId);
    const doc: RawDocument = {
      id: shortId('doc'),
      knowledgeBaseId: kbId,
      title,
      content,
      format,
      language: 'zh',
      createdAt: new Date().toISOString(),
      provenance: {
        sourceId: 'custom',
        sourceName: title,
        license: '院内私有',
        fetchedAt: new Date().toISOString(),
      },
      tenantId: this.kbs.get(kbId)!.tenantId,
      tags,
    };
    const res = await this.ingestDocument(doc);
    return { documentId: doc.id, chunks: res.chunks };
  }

  async ingestDocument(doc: RawDocument): Promise<{ chunks: number; report: unknown }> {
    const kb = this.requireKb(doc.knowledgeBaseId);
    this.documents.set(doc.id, doc);
    this.setStatus(doc.id, kb.id, doc.title, 'parse', 10);
    const { chunks, report, extraction } = buildChunks(doc, kb.chunk, { encoder: this.encoder, extractor: this.extractor });
    for (const c of chunks) {
      this.chunks.set(c.id, c);
      this.retriever.addChunk(c);
    }
    // 抽取结果入图谱
    if (extraction.entities.length) {
      this.graph.importPayload({
        sourceId: doc.provenance.sourceId,
        provenance: doc.provenance,
        entities: extraction.entities.map((e) => ({ name: e.name, type: this.mapEntityType(e.type) })),
        relations: extraction.relations.map((r) => ({ from: r.from, to: r.to, type: r.type })),
      });
    }
    kb.documentCount++;
    kb.chunkCount += chunks.length;
    kb.indexStatus = 'ready';
    kb.updatedAt = new Date().toISOString();
    this.setStatus(doc.id, kb.id, doc.title, 'done', 100, `已索引 ${chunks.length} 个片段，质量分 ${report.qualityScore}`);
    await this.persist();
    return { chunks: chunks.length, report };
  }

  listDocuments(kbId: string): RawDocument[] {
    return [...this.documents.values()].filter((d) => d.knowledgeBaseId === kbId);
  }

  documentStatus(documentId: string): DocumentIndexStatus | undefined {
    return this.indexStatus.get(documentId);
  }

  async removeDocument(documentId: string): Promise<void> {
    const doc = this.documents.get(documentId);
    this.retriever.removeDocumentChunks(documentId);
    this.chunks.forEach((_v, key) => {
      if (this.chunks.get(key)?.documentId === documentId) this.chunks.delete(key);
    });
    if (doc) {
      const kb = this.kbs.get(doc.knowledgeBaseId);
      if (kb) {
        kb.documentCount = Math.max(0, kb.documentCount - 1);
        kb.chunkCount = [...this.chunks.values()].filter((c) => c.knowledgeBaseId === kb.id).length;
      }
    }
    this.documents.delete(documentId);
    this.indexStatus.delete(documentId);
    await this.persist();
  }

  // --------------------------------------------------------------------------
  // 术语库 / 权威数据集
  // --------------------------------------------------------------------------

  /** 装载一个权威数据集（增量去重 + 版本登记 + 质量评分） */
  loadTerms(sourceId: string, incoming: TermEntry[], version: string, checksum: string): { added: number; skipped: number; quality: QualityReport } {
    const existing = this.termsBySource.get(sourceId) ?? [];
    const { added, skipped } = diffIncremental(existing, incoming);
    const merged = [...existing, ...added];
    this.termsBySource.set(sourceId, merged);
    this.rebuildTerms();
    const quality = scoreTerms(sourceId, merged);
    this.versions.record({ sourceId, version, recordCount: merged.length, checksum, importedAt: new Date().toISOString() });
    return { added: added.length, skipped, quality };
  }

  private rebuildTerms(): void {
    this.terms = [...this.termsBySource.values()].flat();
    this.terminology.load(this.terms);
  }

  listSources(): Array<{ sourceId: string; count: number; latest?: string }> {
    return [...this.termsBySource.entries()].map(([sourceId, list]) => ({
      sourceId,
      count: list.length,
      latest: this.versions.latest(sourceId)?.version,
    }));
  }

  termsOf(sourceId: string): TermEntry[] {
    return this.termsBySource.get(sourceId) ?? [];
  }

  standardize(raw: string, sourceFilter?: string): StandardizationResult {
    return this.terminology.standardize(raw, sourceFilter);
  }

  mapCode(code: string, from: string, to: string): { code: string; name: string } | undefined {
    return this.terminology.mapCode(code, from, to);
  }

  importGraph(payload: GraphImportPayload): { entities: number; relations: number } {
    return this.graph.importPayload(payload);
  }

  // --------------------------------------------------------------------------
  // 检索 / 问答
  // --------------------------------------------------------------------------

  search(query: string, kbIds?: string[], opts: { tenantId?: string; topK?: number; minScore?: number } = {}): RetrievalResponse {
    const t0 = Date.now();
    const kbScope = kbIds && kbIds.length ? kbIds : [...this.kbs.keys()];
    // 合并所选 KB 的检索权重
    const firstKb = kbScope.map((id) => this.kbs.get(id)).find(Boolean);
    const hits = this.retriever.search(query, {
      topK: opts.topK ?? firstKb?.retrieval.topK ?? 5,
      candidateK: firstKb?.retrieval.candidateK ?? 30,
      weights: firstKb?.retrieval.weights,
      minScore: opts.minScore ?? firstKb?.retrieval.minScore ?? 0.01,
      rrfK: firstKb?.retrieval.rrfK ?? 60,
      tenantId: opts.tenantId,
    });
    const stats = this.retriever.debugStats().filter((s) => kbScope.includes(s.kb));
    return {
      query,
      rewrittenQuery: query,
      hits,
      debug: {
        vectorCandidates: stats.reduce((s, x) => s + x.chunks, 0),
        keywordCandidates: stats.reduce((s, x) => s + x.chunks, 0),
        graphCandidates: hits.filter((h) => h.kind === 'graph').length,
        latencyMs: Date.now() - t0,
      },
    };
  }

  /** 检索测试（知识库管理界面用）：返回召回片段与得分 */
  retrievalTest(query: string, kbId: string, topK = 5): RetrievalResponse {
    return this.search(query, [kbId], { topK });
  }

  graphQuery(entityName: string, maxHops = 2): { entity?: GraphEntity; neighbors: Array<{ name: string; type: string; relation: string }>; path: string[][] } {
    const id = this.graph.resolve(entityName);
    if (!id) return { neighbors: [], path: [] };
    const entity = this.graph.getEntity(id);
    const neighbors = this.graph.neighbors(id).map((n) => ({ name: n.entity.name, type: n.entity.type, relation: n.relation.type }));
    const expansion = this.graph.expand(entityName, maxHops).map((e) => e.path);
    return { entity, neighbors, path: expansion };
  }

  /**
   * 知识问答工具（供 Agent / 编排层 tool 节点调用）。
   * 返回带引用的结构化结果；answerText 由调用方 LLM 基于 contexts 生成，这里负责可信取证。
   */
  knowledgeQA(question: string, kbIds?: string[], topK = 5): { question: string; contexts: RetrievalResponse['hits']; citations: string[]; disclaimer: string } {
    const res = this.search(question, kbIds, { topK });
    const citations = res.hits.map((h, i) => `[${i + 1}] ${h.title}（${h.provenance.sourceName}${h.provenance.version ? ' ' + h.provenance.version : ''}）`);
    return {
      question,
      contexts: res.hits,
      citations,
      disclaimer: '以上内容为知识检索辅助参考，不构成诊断或治疗依据，不替代执业医师的临床决策。',
    };
  }

  // --------------------------------------------------------------------------
  // 持久化 / 快照
  // --------------------------------------------------------------------------

  snapshot(): { kbCount: number; docCount: number; chunkCount: number; termCount: number; graph: ReturnType<KnowledgeGraph['stats']> } {
    return {
      kbCount: this.kbs.size,
      docCount: this.documents.size,
      chunkCount: this.chunks.size,
      termCount: this.terms.length,
      graph: this.graph.stats(),
    };
  }

  private async persist(): Promise<void> {
    await this.store.set('kbs', [...this.kbs.values()]);
  }

  async hydrate(): Promise<void> {
    const kbs = await this.store.get<KnowledgeBase[]>('kbs');
    if (kbs) for (const kb of kbs) {
      this.kbs.set(kb.id, kb);
      this.retriever.registerKb(kb.id);
    }
  }

  // --------------------------------------------------------------------------
  // helpers
  // --------------------------------------------------------------------------

  private requireKb(id: string): KnowledgeBase {
    const kb = this.kbs.get(id);
    if (!kb) throw new Error(`知识库不存在: ${id}`);
    return kb;
  }

  private setStatus(documentId: string, kbId: string, fileName: string, stage: DocumentIndexStatus['stage'], progress: number, message?: string): void {
    this.indexStatus.set(documentId, { documentId, knowledgeBaseId: kbId, fileName, stage, progress, message, updatedAt: new Date().toISOString() });
  }

  private provenanceFrom(config: ConnectorConfig): SourceProvenance {
    const md = config.metadata ?? {};
    return {
      sourceId: (md.sourceId as string) ?? 'custom',
      sourceName: config.name,
      version: md.version as string | undefined,
      publisher: md.publisher as string | undefined,
      url: config.kind === 'file' ? config.target : config.target,
      license: (md.license as string) ?? '未声明',
      fetchedAt: new Date().toISOString(),
    };
  }

  private mapEntityType(t: string): GraphImportPayload['entities'][number]['type'] {
    const map: Record<string, GraphImportPayload['entities'][number]['type']> = {
      disease: 'disease',
      symptom: 'symptom',
      drug: 'drug',
      examination: 'examination',
      procedure: 'procedure',
    };
    return map[t] ?? 'other';
  }
}
