# 知识库管理器 API

> 对应源码：`src/knowledge/management/KnowledgeBaseManager.ts`、`KnowledgeSource.ts`、`bootstrap.ts`

## 概述

知识库管理器负责医学知识资源的接入、解析、切片、向量化入库与版本管理，是 RAG 与 CDS 的数据底座。

## 核心类

### KnowledgeBaseManager

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `ingest(source)` | `Promise<IngestReport>` | 入库一份知识文档（解析→切片→向量化） |
| `update(id)` | `Promise<void>` | 更新单条知识 |
| `remove(id)` | `Promise<void>` | 删除知识 |
| `listSources()` | `KnowledgeSource[]` | 列出知识来源 |
| `getVersions(id)` | `Version[]` | 版本历史 |

### KnowledgeSource

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 来源ID |
| `type` | enum | guideline/drug/regulation/textbook |
| `name` | string | 名称 |
| `version` | string | 版本 |
| `docCount` | number | 文档数 |

## 入库流水线

```
文档解析(DocumentParser) → 文本切分(TextSplitter) → 向量化(EmbeddingService) → 向量库(VectorStore)
```

## 调用示例

```typescript
const kb = new KnowledgeBaseManager(parser, splitter, embedder, vectorStore);
const report = await kb.ingest(KnowledgeSource.file("高血压防治指南2024.pdf"));
console.log(report.chunkCount, report.failedChunks);
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `PARSE_FAIL` | 文档解析失败 |
| `DUPLICATE_VERSION` | 版本重复 |
| `EMBEDDING_FAIL` | 向量化失败 |

---

*健澜科技数智医院智能体 · 服务 API*
