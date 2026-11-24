# search_medical_knowledge — 医学知识检索

> 所属分类：**知识检索** ｜ 工具名：`search_medical_knowledge` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

基于 RAG 检索引擎，返回与临床问题相关的医学知识（指南、药品说明书、医院制度、临床路径、专家共识、教材、文献、经验总结等）。每条结果标注来源、证据等级、权威性与发布日期，支持证据追溯；可按知识层级、科室、文档类型过滤。用于回答诊断、治疗、用药、制度流程等医学问题。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | 无（公开只读） |
| 适用角色 | 后端未声明硬编码角色（按权限码推导） |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| query | string | 是 | 要检索的医学问题或关键词（非空） |
| knowledgeLevel | enum(L1/L2/L3/L4/L5) | 否 | 限定知识层级：L1基础医学 / L2临床指南 / L3医院本地 / L4专科 / L5经验 |
| department | string | 否 | 限定科室（如 心内科） |
| topK | integer | 否 | 返回结果数量，1–20，默认 5 |
| documentType | enum(临床指南/药品说明书/医院制度/临床路径/专家共识/教材/文献/经验总结) | 否 | 限定文档类型 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| query | string | 本次检索问题 |
| intent | string | 识别到的查询意图 |
| total | number | 命中结果数 |
| results[] | array | 知识条目，含 chunkId/knowledgeId/docTitle/sectionPath/content/level/category/publisher/publishDate/version/authorityScore/evidenceLevel/similarity/relevanceScore/caution |
| context | string | 组装好的增强上下文（含引用编号与参考文献） |
| searchedAt | string | 检索时间（ISO 8601） |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| KNOWLEDGE_RETRIEVAL_ERROR | 医学知识检索失败（引擎异常或未命中可用索引） |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "search_medical_knowledge",
  "input": {
    "query": "阿司匹林与华法林联用的出血风险",
    "topK": 5,
    "documentType": "临床指南"
  }
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": {
    "query": "阿司匹林与华法林联用的出血风险",
    "intent": "用药相互作用查询",
    "total": 2,
    "results": [],
    "context": "（含引用编号与参考文献的增强上下文）",
    "searchedAt": "2026-11-25T04:10:00.000Z"
  }
}
```

### 失败返回示例

```json
{
  "success": false,
  "error": { "code": "KNOWLEDGE_RETRIEVAL_ERROR", "message": "医学知识检索失败" }
}
```

---

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：知识检索*
