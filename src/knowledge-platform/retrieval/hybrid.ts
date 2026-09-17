/**
 * 健澜科技杠OS — 统一混合检索
 *
 * 三路召回 + RRF 融合 + 重排序：
 *   1) 向量路（HashingEncoder 余弦，可替换真实 Embedding）；
 *   2) 关键词路（BM25-lite，中文二元字组 + 拉丁词）；
 *   3) 图谱路（实体识别 → 多跳邻居，提供可解释关系路径）；
 * RRF（Reciprocal Rank Fusion）消除各路量纲差异，再叠加权威性/时效/租户过滤重排。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { type KnowledgeChunk, type RetrievalHit, type TermEntry, type SourceProvenance } from '../types';
import { type Encoder, tokenize } from '../util';
import type { KnowledgeGraph } from '../graph/KnowledgeGraph';

interface IndexedChunk {
  chunk: KnowledgeChunk;
  tokens: string[];
  termFreq: Map<string, number>;
  length: number;
}

/** BM25-lite 关键词索引 */
export class KeywordIndex {
  private docs: IndexedChunk[] = [];
  private df = new Map<string, number>();
  private avgLen = 0;

  add(chunk: KnowledgeChunk): void {
    const tokens = tokenize(chunk.content);
    const termFreq = new Map<string, number>();
    for (const t of tokens) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
    this.docs.push({ chunk, tokens, termFreq, length: tokens.length });
    for (const t of new Set(tokens)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.avgLen = this.docs.reduce((s, d) => s + d.length, 0) / Math.max(1, this.docs.length);
  }

  search(query: string, topK: number): Array<{ chunk: KnowledgeChunk; score: number }> {
    const qTokens = tokenize(query);
    const k1 = 1.5;
    const b = 0.75;
    const N = this.docs.length;
    const scored: Array<{ chunk: KnowledgeChunk; score: number }> = [];
    for (const doc of this.docs) {
      let score = 0;
      for (const qt of qTokens) {
        const df = this.df.get(qt) ?? 0;
        if (!df) continue;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const tf = doc.termFreq.get(qt) ?? 0;
        score += (idf * (tf * (k1 + 1))) / (tf + k1 * (1 - b + (b * doc.length) / Math.max(1, this.avgLen)));
      }
      if (score > 0) scored.push({ chunk: doc.chunk, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  get size(): number {
    return this.docs.length;
  }
}

/** 向量索引（内存余弦） */
export class VectorIndex {
  private items: Array<{ chunk: KnowledgeChunk; vector: number[] }> = [];
  constructor(private encoder: Encoder) {}

  add(chunk: KnowledgeChunk): void {
    const vector = chunk.vector ?? this.encoder.embed(chunk.content);
    this.items.push({ chunk, vector });
  }

  search(query: string, topK: number): Array<{ chunk: KnowledgeChunk; score: number }> {
    const qv = this.encoder.embed(query);
    return this.items
      .map((it) => ({ chunk: it.chunk, score: this.encoder.cosine(qv, it.vector) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  get size(): number {
    return this.items.length;
  }
}

export interface HybridWeights {
  vector: number;
  keyword: number;
  graph: number;
}

export interface HybridSearchOptions {
  topK?: number;
  candidateK?: number;
  weights?: HybridWeights;
  minScore?: number;
  rrfK?: number;
  tenantId?: string;
  kbIds?: string[];
}

/** 统一混合检索器：聚合多个 KB 的 chunk、术语库与图谱 */
export class HybridRetriever {
  constructor(
    private encoder: Encoder,
    private graph: KnowledgeGraph,
    /** 术语库（code/name/synonym 精确与模糊匹配） */
    private termsProvider: () => TermEntry[] = () => [],
  ) {}

  private chunkStores = new Map<string, { kw: KeywordIndex; vec: VectorIndex; chunks: KnowledgeChunk[] }>();

  registerKb(kbId: string): void {
    if (!this.chunkStores.has(kbId)) {
      this.chunkStores.set(kbId, { kw: new KeywordIndex(), vec: new VectorIndex(this.encoder), chunks: [] });
    }
  }

  addChunk(chunk: KnowledgeChunk): void {
    this.registerKb(chunk.knowledgeBaseId);
    const store = this.chunkStores.get(chunk.knowledgeBaseId)!;
    store.kw.add(chunk);
    store.vec.add(chunk);
    store.chunks.push(chunk);
  }

  removeDocumentChunks(documentId: string): void {
    for (const [kbId, store] of this.chunkStores) {
      const kept = store.chunks.filter((c) => c.documentId !== documentId);
      if (kept.length !== store.chunks.length) {
        const rebuilt = { kw: new KeywordIndex(), vec: new VectorIndex(this.encoder), chunks: kept };
        kept.forEach((c) => {
          rebuilt.kw.add(c);
          rebuilt.vec.add(c);
        });
        this.chunkStores.set(kbId, rebuilt);
      }
    }
  }

  /** RRF 融合：score = Σ weight / (rrfK + rank) */
  private rrf(
    rankedLists: Array<{ list: Array<{ id: string; hit: RetrievalHit }>; weight: number }>,
    rrfK: number,
  ): Map<string, { hit: RetrievalHit; score: number }> {
    const fused = new Map<string, { hit: RetrievalHit; score: number }>();
    for (const { list, weight } of rankedLists) {
      list.forEach((item, rank) => {
        const inc = weight / (rrfK + rank + 1);
        const prev = fused.get(item.id);
        if (prev) prev.score += inc;
        else fused.set(item.id, { hit: item.hit, score: inc });
      });
    }
    return fused;
  }

  search(query: string, opts: HybridSearchOptions = {}): RetrievalHit[] {
    const topK = opts.topK ?? 5;
    const candidateK = opts.candidateK ?? 30;
    const weights = opts.weights ?? { vector: 0.45, keyword: 0.35, graph: 0.2 };
    const rrfK = opts.rrfK ?? 60;

    const stores = [...this.chunkStores.values()];
    const inScope = (c: KnowledgeChunk): boolean => {
      if (opts.tenantId && c.tenantId !== opts.tenantId && c.tenantId !== 'public') return false;
      return true;
    };

    // 路 1：向量
    const vectorList: Array<{ id: string; hit: RetrievalHit }> = [];
    for (const s of stores) {
      for (const r of s.vec.search(query, candidateK)) {
        if (!inScope(r.chunk)) continue;
        vectorList.push({ id: r.chunk.id, hit: this.chunkHit(r.chunk, r.score) });
      }
    }
    vectorList.sort((a, b) => b.hit.score - a.hit.score).splice(candidateK);

    // 路 2：关键词 BM25（归一化到 0-1 近似）
    const kwList: Array<{ id: string; hit: RetrievalHit }> = [];
    for (const s of stores) {
      const raw = s.kw.search(query, candidateK);
      const max = raw[0]?.score ?? 1;
      for (const r of raw) {
        if (!inScope(r.chunk)) continue;
        kwList.push({ id: r.chunk.id, hit: this.chunkHit(r.chunk, max > 0 ? r.score / max : 0) });
      }
    }
    kwList.sort((a, b) => b.hit.score - a.hit.score).splice(candidateK);

    // 路 3：图谱（实体名/别名命中 → 多跳）
    const graphList = this.graphRecall(query, candidateK);

    // 术语库精确匹配（并入关键词路，提升编码/标准化召回）
    for (const t of this.termMatch(query, candidateK)) {
      kwList.push({ id: t.id, hit: t });
    }

    const fused = this.rrf(
      [
        { list: vectorList, weight: weights.vector },
        { list: kwList, weight: weights.keyword },
        { list: graphList, weight: weights.graph },
      ],
      rrfK,
    );

    const merged = [...fused.values()]
      .map((x) => ({ ...x, score: this.rerank(query, x.hit, x.score) }))
      .filter((x) => x.score >= (opts.minScore ?? 0.001))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return merged.map((m) => ({ ...m.hit, score: Number(m.score.toFixed(4)) }));
  }

  private chunkHit(chunk: KnowledgeChunk, score: number): RetrievalHit {
    return {
      id: chunk.id,
      kind: 'chunk',
      content: chunk.content,
      title: String(chunk.metadata.title ?? chunk.sectionPath ?? '知识片段'),
      score,
      sectionPath: chunk.sectionPath,
      provenance: chunk.provenance,
      metadata: { kbId: chunk.knowledgeBaseId, tokens: chunk.tokens, entities: chunk.entities },
    };
  }

  private graphRecall(query: string, topK: number): Array<{ id: string; hit: RetrievalHit }> {
    const out: Array<{ id: string; hit: RetrievalHit }> = [];
    const seen = new Set<string>();
    // 在图谱实体名/别名中扫描查询命中
    for (const entity of this.graph.entities.values()) {
      const names = [entity.name, ...entity.aliases];
      const hitName = names.find((n) => query.includes(n) || n.includes(query.trim()));
      if (!hitName) continue;
      if (!seen.has(entity.id)) {
        seen.add(entity.id);
        const codes = Object.entries(entity.codes).map(([k, v]) => `${k}:${v}`).join('；');
        out.push({
          id: entity.id,
          hit: {
            id: entity.id,
            kind: 'graph',
            content: `${entity.name}（${entity.type}）${codes ? ' 编码 ' + codes : ''}`,
            title: entity.name,
            score: 1,
            provenance: entity.provenance,
            metadata: { type: entity.type, codes: entity.codes },
          },
        });
      }
      for (const n of this.graph.expand(hitName, 1).slice(0, 5)) {
        if (seen.has(n.entity.id)) continue;
        seen.add(n.entity.id);
        out.push({
          id: n.entity.id,
          hit: {
            id: n.entity.id,
            kind: 'graph',
            content: `${hitName} —${n.path.slice(1, -1).join('→')}→ ${n.entity.name}`,
            title: n.entity.name,
            score: Math.max(0.3, 0.7 - n.depth * 0.2),
            graphPath: n.path.join(' '),
            provenance: n.entity.provenance,
            metadata: { type: n.entity.type },
          },
        });
      }
    }
    return out.slice(0, topK);
  }

  private termMatch(query: string, topK: number): RetrievalHit[] {
    const q = query.trim().toLowerCase();
    const hits: RetrievalHit[] = [];
    for (const t of this.termsProvider()) {
      const names = [t.name, ...t.synonyms];
      let best = 0;
      for (const n of names) {
        const nl = n.toLowerCase();
        if (nl === q) best = 1;
        else if (nl.includes(q) || q.includes(nl)) best = Math.max(best, 0.75);
      }
      if (best > 0) {
        hits.push({
          id: t.id,
          kind: 'term',
          content: `${t.name} [${t.code}]${t.synonyms.length ? ' 同义词：' + t.synonyms.join('、') : ''}`,
          title: t.name,
          score: best,
          provenance: t.provenance,
          metadata: { code: t.code, sourceId: t.sourceId, fields: t.fields },
        });
      }
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /** 重排序：在 RRF 基础上叠加权威、时效、标题命中、查询覆盖度 */
  private rerank(query: string, hit: RetrievalHit, base: number): number {
    let s = base;
    const authority = Number(hit.metadata?.authorityScore ?? 3) / 5;
    s += authority * 0.02;
    if (hit.title && query.includes(hit.title.slice(0, 4))) s += 0.03;
    const qTokens = new Set(tokenize(query));
    const cTokens = new Set(tokenize(hit.content));
    let cover = 0;
    qTokens.forEach((t) => {
      if (cTokens.has(t)) cover++;
    });
    s += (cover / Math.max(1, qTokens.size)) * 0.05;
    return s;
  }

  debugStats(): { kb: string; chunks: number }[] {
    return [...this.chunkStores.entries()].map(([kb, s]) => ({ kb, chunks: s.chunks.length }));
  }

  emptyProvenance(): SourceProvenance {
    return { sourceId: 'custom', sourceName: '自建知识', license: '内部', fetchedAt: new Date().toISOString() };
  }
}
