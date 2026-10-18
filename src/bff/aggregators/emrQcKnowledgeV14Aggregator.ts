/**
 * 健澜科技 jlmedaios - 病历质控知识库 V14 聚合器（M475-D，M475 收官）
 *
 * 包装 searchQcKnowledge / buildKnowledgeEntry。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import {
  searchQcKnowledge as searchQcKnowledgeBase,
  buildKnowledgeEntry as buildKnowledgeEntryBase,
  type KnowledgeEntryV14,
} from "../../knowledge/emr/qcKnowledgeBaseV14";

/**
 * 按关键词搜索质控知识。
 *
 * @param keyword 关键词
 * @returns 匹配的知识条目
 */
export function searchQcKnowledge(keyword: string): KnowledgeEntryV14[] {
  return searchQcKnowledgeBase(keyword);
}

/**
 * 创建知识条目。
 *
 * @param id 条目 ID
 * @param category 分类
 * @param title 标题
 * @param content 内容
 * @returns 知识条目
 */
export function buildKnowledgeEntry(id: string, category: string, title: string, content: string): KnowledgeEntryV14 {
  return buildKnowledgeEntryBase(id, category, title, content);
}

export type { KnowledgeEntryV14 } from "../../knowledge/emr/qcKnowledgeBaseV14";
