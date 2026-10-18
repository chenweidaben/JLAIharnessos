/**
 * 健澜科技 jlmedaios - 质控知识关系管理 V14 聚合器（M489-B）
 *
 * 纯函数：知识关系构建 + 关系聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知识关系 */
export interface KnowledgeRelationV14 {
  id: string;
  source: string;
  target: string;
  type: string;
}

/**
 * 构建知识关系。
 *
 * @param id 关系ID
 * @param source 源节点
 * @param target 目标节点
 * @param type 关系类型
 * @returns 知识关系
 */
export function buildKnowledgeRelation(id: string, source: string, target: string, type: string): KnowledgeRelationV14 {
  return { id, source, target, type };
}

/**
 * 聚合知识关系（总数+关系类型列表）。
 *
 * @param relations 关系列表
 * @returns 聚合结果
 */
export function aggregateKnowledgeRelations(relations: { id: string; source: string; target: string; type: string }[]): { count: number; relationTypes: string[] } {
  const count = relations.length;
  // 手算：relationTypes = 去重后的关系类型集合
  const relationTypes = Array.from(new Set(relations.map((r) => r.type)));
  return { count, relationTypes };
}
