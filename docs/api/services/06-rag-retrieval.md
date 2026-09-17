# RAG 检索引擎 API

> 对应源码：`src/knowledge/retrieval/RetrievalEngine.ts`、`QueryUnderstanding.ts`、`Reranker.ts`、`ContextBuilder.ts`

## 概述

RAG 检索引擎负责对医学知识库进行语义检索，完成"查询理解 → 向量召回 → 重排 → 上下文拼装"，为 CDS 与问答提供循证依据。

## 核心类

### RetrievalEngine

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `search(query, opts)` | `Chunk[]` | 语义检索知识库 |
| `retrieveAndRerank(query, k)` | `ScoredChunk[]` | 召回 + 重排 |

### QueryUnderstanding

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `parse(query)` | `ParsedQuery` | 意图识别、实体抽取、查询改写 |

### Reranker

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `rerank(query, chunks)` | `ScoredChunk[]` | 对召回结果重排打分 |

### ContextBuilder

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `build(chunks, budget)` | `string` | 将命中片段拼装为可注入上下文 |

## 参数说明

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | string | 是 | 自然语言查询 |
| `topK` | number | 否 | 召回条数，默认 8 |
| `source` | enum | 否 | 知识库来源：指南/药品库/院内制度 |
| `minScore` | number | 否 | 最低相似度阈值 |

## 调用示例

```typescript
const engine = new RetrievalEngine(vectorStore, reranker, embedder);
const chunks = await engine.retrieveAndRerank("阿司匹林与华法林能否联用", 5);
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `EMBEDDING_FAIL` | 向量化失败 |
| `VECTOR_STORE_UNAVAILABLE` | 向量库不可用 |
| `NO_RESULT` | 无命中（返回空，非错误） |

---

*健澜科技数智医院智能体 · 服务 API*
