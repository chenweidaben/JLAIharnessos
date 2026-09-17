/**
 * 健澜科技数智医院智能体 - 医学知识检索工具
 *
 * 工具名：search_medical_knowledge
 * 功能：基于 RAG 检索引擎，返回与临床问题相关的医学知识（指南、药品说明书、制度、路径等），
 *       每条结果带来源、证据等级、相似度与发布日期，支持证据追溯。
 * 风险等级：low
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { getSharedRetrievalEngine } from '@knowledge/bootstrap';
import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

/** 知识检索结果条目 */
const KnowledgeItem = z.object({
  chunkId: z.string(),
  knowledgeId: z.string(),
  docTitle: z.string().describe('文档标题/来源'),
  sectionPath: z.string().describe('章节路径'),
  content: z.string().describe('知识内容片段'),
  level: z.string().describe('知识层级 L1-L5'),
  category: z.string().describe('文档分类'),
  publisher: z.string().describe('发布机构'),
  publishDate: z.string().describe('发布日期'),
  version: z.string().describe('版本'),
  authorityScore: z.number().int().describe('权威性 1-5'),
  evidenceLevel: z.string().optional().describe('证据等级'),
  similarity: z.number().describe('向量相似度'),
  relevanceScore: z.number().describe('综合相关性分数'),
  caution: z.string().optional().describe('可信度提示'),
});

const SearchMedicalKnowledgeInput = z.object({
  query: z.string().min(1).describe('要检索的医学问题或关键词'),
  knowledgeLevel: z
    .enum(['L1', 'L2', 'L3', 'L4', 'L5'])
    .optional()
    .describe('限定知识层级：L1基础医学/L2临床指南/L3医院本地/L4专科/L5经验'),
  department: z.string().optional().describe('限定科室（如 心内科）'),
  topK: z.number().int().min(1).max(20).default(5).describe('返回结果数量，默认 5'),
  documentType: z
    .enum([
      '临床指南',
      '药品说明书',
      '医院制度',
      '临床路径',
      '专家共识',
      '教材',
      '文献',
      '经验总结',
    ])
    .optional()
    .describe('限定文档类型'),
});

const SearchMedicalKnowledgeOutput = z.object({
  success: z.boolean(),
  query: z.string(),
  intent: z.string().describe('识别到的查询意图'),
  total: z.number().describe('命中结果数'),
  results: z.array(KnowledgeItem),
  context: z.string().describe('组装好的增强上下文（含引用编号与参考文献）'),
  searchedAt: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 医学知识检索。
 *
 * 调用 RAG 检索引擎（查询理解 → 混合检索 → 重排序 → 上下文构建），
 * 返回相关医学知识及其来源、证据等级与相似度。
 */
async function executeSearchMedicalKnowledge(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<z.infer<typeof SearchMedicalKnowledgeOutput>>> {
  const parsed = SearchMedicalKnowledgeInput.parse(input);

  try {
    const engine = await getSharedRetrievalEngine();
    const resp = await engine.retrieve(parsed.query, {
      topK: parsed.topK,
      knowledgeLevel: parsed.knowledgeLevel,
      department: parsed.department,
      documentType: parsed.documentType,
    });

    const results = resp.results.map((r) => ({
      chunkId: r.chunkId,
      knowledgeId: r.knowledgeId,
      docTitle: r.docTitle,
      sectionPath: r.sectionPath,
      content: r.content,
      level: r.level,
      category: r.category,
      publisher: r.publisher,
      publishDate: r.publishDate,
      version: r.version,
      authorityScore: r.authorityScore,
      evidenceLevel: r.evidenceLevel,
      similarity: Number(r.similarityScore.toFixed(4)),
      relevanceScore: Number(r.relevanceScore.toFixed(4)),
      caution: r.caution,
    }));

    return {
      success: true,
      data: {
        success: true,
        query: parsed.query,
        intent: resp.understanding.intent,
        total: results.length,
        results,
        context: resp.context.contextText,
        searchedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'KNOWLEDGE_RETRIEVAL_ERROR',
        message: err instanceof Error ? err.message : '医学知识检索失败',
      },
    };
  }
}

// ============================================================================
// 工具导出
// ============================================================================

export const searchMedicalKnowledgeTool = buildMedicalTool({
  name: 'search_medical_knowledge',
  description:
    '检索医学知识库，返回与临床问题相关的指南、药品说明书、医院制度、临床路径等知识。' +
    '每条结果标注来源、证据等级、权威性与发布日期，支持证据追溯。' +
    '可按知识层级（L1-L5）、科室、文档类型过滤。用于回答诊断、治疗、用药、制度流程等医学问题。',
  category: MedicalToolCategory.KNOWLEDGE,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: SearchMedicalKnowledgeInput,
  outputSchema: SearchMedicalKnowledgeOutput,
  execute: executeSearchMedicalKnowledge,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '医学知识检索',
  getActivityDescription: (input: unknown) => {
    const parsed = SearchMedicalKnowledgeInput.safeParse(input);
    if (parsed.success) return `医学知识检索: ${parsed.data.query}`;
    return '医学知识检索';
  },
});

export type SearchMedicalKnowledgeInputType = z.infer<typeof SearchMedicalKnowledgeInput>;
